"""
Test bulk file upload feature for cookie checking.
Tests the new /api/check/files endpoint (multiple files) and /api/check/file (single file)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_KEY = "PritongTinola*3030"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token using master key"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSingleFileUpload:
    """Tests for POST /api/check/file - single file upload"""
    
    def test_single_file_upload_requires_auth(self):
        """POST /api/check/file requires authentication"""
        test_file = io.BytesIO(b"NetflixId=testvalue")
        files = {"file": ("test.txt", test_file, "text/plain")}
        response = requests.post(f"{BASE_URL}/api/check/file", files=files)
        assert response.status_code == 401
        print("PASS: Single file upload requires auth")
    
    def test_single_file_upload_returns_results(self, headers):
        """POST /api/check/file returns expected structure"""
        test_cookie = "NetflixId=test123; SecureNetflixId=secure123"
        test_file = io.BytesIO(test_cookie.encode())
        files = {"file": ("test_cookie.txt", test_file, "text/plain")}
        
        response = requests.post(f"{BASE_URL}/api/check/file", files=files, headers=headers)
        assert response.status_code == 200, f"Request failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have 'id' field"
        assert "results" in data, "Response should have 'results' field"
        assert "total" in data, "Response should have 'total' field"
        assert "valid_count" in data, "Response should have 'valid_count' field"
        assert "expired_count" in data, "Response should have 'expired_count' field"
        assert "invalid_count" in data, "Response should have 'invalid_count' field"
        assert data["total"] >= 1, "Should have at least 1 result"
        print(f"PASS: Single file upload returns correct structure with {data['total']} result(s)")
    
    def test_single_file_no_cookies_returns_400(self, headers):
        """POST /api/check/file with empty file returns 400"""
        test_file = io.BytesIO(b"")
        files = {"file": ("empty.txt", test_file, "text/plain")}
        
        response = requests.post(f"{BASE_URL}/api/check/file", files=files, headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: Empty file returns 400 with detail: {data['detail']}")


class TestBulkFileUpload:
    """Tests for POST /api/check/files - multiple file upload"""
    
    def test_bulk_upload_requires_auth(self):
        """POST /api/check/files requires authentication"""
        test_file1 = io.BytesIO(b"NetflixId=testvalue1")
        test_file2 = io.BytesIO(b"NetflixId=testvalue2")
        files = [
            ("files", ("test1.txt", test_file1, "text/plain")),
            ("files", ("test2.txt", test_file2, "text/plain")),
        ]
        response = requests.post(f"{BASE_URL}/api/check/files", files=files)
        assert response.status_code == 401
        print("PASS: Bulk file upload requires auth")
    
    def test_bulk_upload_two_files_returns_combined_results(self, headers):
        """POST /api/check/files with 2 files returns combined results with filenames"""
        # Create two test files with cookies
        test_cookie1 = "NetflixId=test1; SecureNetflixId=secure1"
        test_cookie2 = "NetflixId=test2; SecureNetflixId=secure2"
        
        test_file1 = io.BytesIO(test_cookie1.encode())
        test_file2 = io.BytesIO(test_cookie2.encode())
        
        files = [
            ("files", ("cookie_file_1.txt", test_file1, "text/plain")),
            ("files", ("cookie_file_2.txt", test_file2, "text/plain")),
        ]
        
        response = requests.post(f"{BASE_URL}/api/check/files", files=files, headers=headers)
        assert response.status_code == 200, f"Request failed: {response.text}"
        
        data = response.json()
        # Check required fields
        assert "id" in data, "Response should have 'id' field"
        assert "results" in data, "Response should have 'results' field"
        assert "total" in data, "Response should have 'total' field"
        assert "valid_count" in data, "Response should have 'valid_count' field"
        assert "expired_count" in data, "Response should have 'expired_count' field"
        assert "invalid_count" in data, "Response should have 'invalid_count' field"
        assert "filenames" in data, "Response should have 'filenames' array"
        
        # Verify filenames
        assert isinstance(data["filenames"], list), "filenames should be a list"
        assert len(data["filenames"]) == 2, f"Should have 2 filenames, got {len(data['filenames'])}"
        assert "cookie_file_1.txt" in data["filenames"], "Should include first filename"
        assert "cookie_file_2.txt" in data["filenames"], "Should include second filename"
        
        # Verify combined results
        assert data["total"] >= 2, f"Should have at least 2 results from 2 files, got {data['total']}"
        
        print(f"PASS: Bulk upload with 2 files - Total: {data['total']}, Filenames: {data['filenames']}")
    
    def test_bulk_upload_three_files_returns_all_filenames(self, headers):
        """POST /api/check/files with 3 files returns all filenames"""
        test_file1 = io.BytesIO(b"NetflixId=bulk1; SecureNetflixId=sec1")
        test_file2 = io.BytesIO(b"NetflixId=bulk2; SecureNetflixId=sec2")
        test_file3 = io.BytesIO(b"NetflixId=bulk3; SecureNetflixId=sec3")
        
        files = [
            ("files", ("bulk_a.txt", test_file1, "text/plain")),
            ("files", ("bulk_b.txt", test_file2, "text/plain")),
            ("files", ("bulk_c.txt", test_file3, "text/plain")),
        ]
        
        response = requests.post(f"{BASE_URL}/api/check/files", files=files, headers=headers)
        assert response.status_code == 200, f"Request failed: {response.text}"
        
        data = response.json()
        assert len(data["filenames"]) == 3, f"Should have 3 filenames, got {len(data['filenames'])}"
        assert data["total"] >= 3, f"Should have at least 3 results, got {data['total']}"
        
        print(f"PASS: Bulk upload with 3 files - Total: {data['total']}, Filenames: {data['filenames']}")
    
    def test_bulk_upload_empty_files_returns_400(self, headers):
        """POST /api/check/files with all empty files returns 400"""
        test_file1 = io.BytesIO(b"")
        test_file2 = io.BytesIO(b"")
        
        files = [
            ("files", ("empty1.txt", test_file1, "text/plain")),
            ("files", ("empty2.txt", test_file2, "text/plain")),
        ]
        
        response = requests.post(f"{BASE_URL}/api/check/files", files=files, headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: Empty files return 400 with detail: {data['detail']}")
    
    def test_bulk_upload_cookies_processed_correctly(self, headers):
        """Verify cookies from multiple files are all processed"""
        # Each file has one cookie block
        test_file1 = io.BytesIO(b"NetflixId=val1\n\nSecureNetflixId=sec1")
        test_file2 = io.BytesIO(b"NetflixId=val2\n\nSecureNetflixId=sec2")
        
        files = [
            ("files", ("f1.txt", test_file1, "text/plain")),
            ("files", ("f2.txt", test_file2, "text/plain")),
        ]
        
        response = requests.post(f"{BASE_URL}/api/check/files", files=files, headers=headers)
        assert response.status_code == 200, f"Request failed: {response.text}"
        
        data = response.json()
        # Verify totals add up
        total = data["valid_count"] + data["expired_count"] + data["invalid_count"]
        assert total == data["total"], f"Counts should sum to total: {total} != {data['total']}"
        
        print(f"PASS: Cookie counts verified - Valid: {data['valid_count']}, Expired: {data['expired_count']}, Invalid: {data['invalid_count']}")


class TestAuthEndpoint:
    """Test authentication works correctly"""
    
    def test_login_with_admin_key(self):
        """POST /api/auth/login with admin key returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should have token"
        assert "user" in data, "Response should have user info"
        assert data["user"]["is_master"] == True, "Admin should be master"
        
        print(f"PASS: Login successful - User: {data['user']['label']}, is_master: {data['user']['is_master']}")
    
    def test_login_with_invalid_key(self):
        """POST /api/auth/login with invalid key returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": "invalidkey123"})
        assert response.status_code == 401
        print("PASS: Invalid key returns 401")


class TestPasteCookieEndpoint:
    """Test POST /api/check (paste cookie) still works"""
    
    def test_paste_cookie_works(self, headers):
        """POST /api/check with pasted cookie text works"""
        response = requests.post(
            f"{BASE_URL}/api/check",
            json={
                "cookies_text": "NetflixId=pastetest; SecureNetflixId=pastesec",
                "format_type": "auto"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        
        data = response.json()
        assert "results" in data
        assert "total" in data
        assert data["total"] >= 1
        
        print(f"PASS: Paste cookie works - Total: {data['total']} result(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
