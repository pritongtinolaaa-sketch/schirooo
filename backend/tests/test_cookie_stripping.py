"""
Test cookie data stripping for non-admin users (iteration 7)
Tests:
1. GET /api/free-cookies (non-admin) should NOT contain browser_cookies or full_cookie
2. GET /api/admin/free-cookies (admin) should STILL contain browser_cookies and full_cookie
3. Non-admin user can still see email, plan, country, profiles, nftoken on free cookies
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_KEY = "PritongTinola*3030"

class TestCookieStripping:
    """Test that sensitive cookie data is stripped for non-admin users"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login with admin key"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def non_admin_key_and_token(self, admin_token):
        """Create a non-admin key and login with it"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test key
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/keys",
            json={"label": "TEST_CookieStrippingUser", "max_devices": 1},
            headers=headers
        )
        assert create_resp.status_code == 200, f"Failed to create test key: {create_resp.text}"
        key_data = create_resp.json()
        key_value = key_data["key_value"]
        key_id = key_data["id"]
        
        # Login with the non-admin key
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"key": key_value})
        assert login_resp.status_code == 200, f"Non-admin login failed: {login_resp.text}"
        token = login_resp.json()["token"]
        
        yield {"key_id": key_id, "token": token}
        
        # Cleanup: delete the test key
        requests.delete(f"{BASE_URL}/api/admin/keys/{key_id}", headers=headers)
    
    def test_admin_free_cookies_contains_sensitive_data(self, admin_token):
        """Admin endpoint should return browser_cookies and full_cookie"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/free-cookies", headers=headers)
        
        assert response.status_code == 200, f"Admin free-cookies failed: {response.text}"
        data = response.json()
        assert "cookies" in data, "Response should have 'cookies' key"
        
        cookies = data["cookies"]
        if len(cookies) > 0:
            # At least one cookie should have these fields
            cookie = cookies[0]
            # These fields SHOULD be present for admin
            assert "browser_cookies" in cookie or cookie.get("browser_cookies") is not None or "browser_cookies" in str(cookie.keys()), \
                f"Admin should see browser_cookies field. Keys: {cookie.keys()}"
            assert "full_cookie" in cookie or cookie.get("full_cookie") is not None or "full_cookie" in str(cookie.keys()), \
                f"Admin should see full_cookie field. Keys: {cookie.keys()}"
            print(f"PASS: Admin can see browser_cookies and full_cookie fields")
            print(f"Cookie keys for admin: {list(cookie.keys())}")
        else:
            pytest.skip("No free cookies in DB to test")
    
    def test_non_admin_free_cookies_strips_sensitive_data(self, non_admin_key_and_token):
        """Non-admin endpoint should NOT return browser_cookies and full_cookie"""
        headers = {"Authorization": f"Bearer {non_admin_key_and_token['token']}"}
        response = requests.get(f"{BASE_URL}/api/free-cookies", headers=headers)
        
        assert response.status_code == 200, f"Non-admin free-cookies failed: {response.text}"
        cookies = response.json()
        
        if len(cookies) > 0:
            for idx, cookie in enumerate(cookies):
                # These fields should NOT be present for non-admin
                assert "browser_cookies" not in cookie, \
                    f"Cookie {idx}: Non-admin should NOT see browser_cookies"
                assert "full_cookie" not in cookie, \
                    f"Cookie {idx}: Non-admin should NOT see full_cookie"
            print(f"PASS: Non-admin cannot see browser_cookies and full_cookie fields")
            print(f"Cookie keys for non-admin: {list(cookies[0].keys())}")
        else:
            pytest.skip("No free cookies in DB to test")
    
    def test_non_admin_can_still_see_basic_info(self, non_admin_key_and_token):
        """Non-admin should still see email, plan, country, profiles, nftoken"""
        headers = {"Authorization": f"Bearer {non_admin_key_and_token['token']}"}
        response = requests.get(f"{BASE_URL}/api/free-cookies", headers=headers)
        
        assert response.status_code == 200, f"Non-admin free-cookies failed: {response.text}"
        cookies = response.json()
        
        if len(cookies) > 0:
            cookie = cookies[0]
            # These fields SHOULD be visible to non-admin
            expected_fields = ["id", "email", "plan", "country", "profiles", "nftoken", "nftoken_link"]
            for field in expected_fields:
                # Check field is in the response (value can be None)
                assert field in cookie, f"Non-admin should see '{field}' field. Available: {list(cookie.keys())}"
            
            print(f"PASS: Non-admin can see basic fields: {expected_fields}")
        else:
            pytest.skip("No free cookies in DB to test")
    
    def test_admin_free_cookies_has_all_fields(self, admin_token):
        """Admin should see ALL fields including sensitive ones"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/free-cookies", headers=headers)
        
        assert response.status_code == 200, f"Admin free-cookies failed: {response.text}"
        data = response.json()
        
        if len(data["cookies"]) > 0:
            cookie = data["cookies"][0]
            # Admin should see all fields
            all_fields = ["id", "email", "plan", "country", "profiles", "nftoken", "nftoken_link", 
                          "browser_cookies", "full_cookie", "member_since", "next_billing"]
            for field in all_fields:
                assert field in cookie, f"Admin should see '{field}' field. Available: {list(cookie.keys())}"
            
            print(f"PASS: Admin can see all fields: {all_fields}")
        else:
            pytest.skip("No free cookies in DB to test")


class TestFreeCookiesAPIAuth:
    """Test authentication guards on free cookies endpoints"""
    
    def test_free_cookies_requires_auth(self):
        """GET /api/free-cookies should require authentication"""
        response = requests.get(f"{BASE_URL}/api/free-cookies")
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print("PASS: /api/free-cookies requires authentication")
    
    def test_admin_free_cookies_requires_auth(self):
        """GET /api/admin/free-cookies should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/free-cookies")
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print("PASS: /api/admin/free-cookies requires authentication")
    
    def test_admin_free_cookies_requires_admin(self):
        """GET /api/admin/free-cookies should require admin privileges"""
        # First create a non-admin token
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        admin_token = admin_resp.json()["token"]
        
        # Create non-admin key
        key_resp = requests.post(
            f"{BASE_URL}/api/admin/keys",
            json={"label": "TEST_AdminGuardUser", "max_devices": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        key_value = key_resp.json()["key_value"]
        key_id = key_resp.json()["id"]
        
        # Login as non-admin
        non_admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"key": key_value})
        non_admin_token = non_admin_resp.json()["token"]
        
        # Try to access admin endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/free-cookies",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        assert response.status_code == 403, f"Should return 403 for non-admin, got {response.status_code}"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/keys/{key_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print("PASS: /api/admin/free-cookies requires admin privileges (403 for non-admin)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
