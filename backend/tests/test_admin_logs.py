"""
Test suite for Admin Logs API and related features in Schiro Cookie Checker
Tests:
- Admin logs API endpoints (GET, DELETE)
- Authorization/non-admin access
- Valid cookies logging behavior
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_KEY = "PritongTinola*3030"

class TestAdminLogsAPI:
    """Admin Logs API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        yield
    
    def test_admin_logs_get_returns_array(self):
        """GET /api/admin/logs returns array (admin only)"""
        response = requests.get(f"{BASE_URL}/api/admin/logs", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected array response"
    
    def test_admin_logs_get_unauthenticated(self):
        """GET /api/admin/logs without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/logs")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_admin_logs_get_non_admin_forbidden(self):
        """GET /api/admin/logs with non-admin key returns 403"""
        # Create a non-admin key
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/keys",
            headers=self.admin_headers,
            json={"label": f"TEST_NonAdmin_{uuid.uuid4().hex[:6]}", "max_devices": 1}
        )
        assert create_resp.status_code == 200
        non_admin_key = create_resp.json()["key_value"]
        
        # Login with non-admin key
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"key": non_admin_key})
        assert login_resp.status_code == 200
        non_admin_token = login_resp.json()["token"]
        
        # Try to access admin logs
        response = requests.get(
            f"{BASE_URL}/api/admin/logs",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        assert response.status_code == 403
        assert "Admin access required" in response.json().get("detail", "")
    
    def test_admin_logs_delete_single_not_found(self):
        """DELETE /api/admin/logs/{log_id} returns 404 for non-existent log"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/logs/nonexistent-id",
            headers=self.admin_headers
        )
        assert response.status_code == 404
        assert "Log not found" in response.json().get("detail", "")
    
    def test_admin_logs_clear_all_success(self):
        """DELETE /api/admin/logs clears all logs"""
        response = requests.delete(f"{BASE_URL}/api/admin/logs", headers=self.admin_headers)
        assert response.status_code == 200
        assert "message" in response.json()
        
        # Verify logs are empty
        get_resp = requests.get(f"{BASE_URL}/api/admin/logs", headers=self.admin_headers)
        assert get_resp.status_code == 200
        assert get_resp.json() == []


class TestCookieCheckLogging:
    """Test that valid cookie checks are logged correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        assert response.status_code == 200
        data = response.json()
        self.admin_token = data["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        yield
    
    def test_check_cookies_expired_not_logged(self):
        """POST /api/check with expired/invalid cookies should NOT create log"""
        # Clear logs first
        requests.delete(f"{BASE_URL}/api/admin/logs", headers=self.admin_headers)
        
        # Check with dummy cookie (will result in expired status since it's not valid Netflix cookie)
        response = requests.post(
            f"{BASE_URL}/api/check",
            headers=self.admin_headers,
            json={
                "cookies_text": "NetflixId=expired123; SecureNetflixId=invalid456",
                "format_type": "auto"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Expect the result to be expired/invalid (not valid)
        assert data["results"][0]["status"] in ["expired", "invalid"]
        
        # Verify no logs were created (since cookie was not valid)
        logs_resp = requests.get(f"{BASE_URL}/api/admin/logs", headers=self.admin_headers)
        assert logs_resp.status_code == 200
        # Logs should still be empty since no valid cookies were checked
        assert len(logs_resp.json()) == 0, "Expired cookies should NOT be logged"


class TestNavbarLogsLink:
    """Verify navbar shows Logs link only for admin users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        assert response.status_code == 200
        self.admin_user = response.json()["user"]
        yield
    
    def test_admin_user_is_master(self):
        """Admin user has is_master=True"""
        assert self.admin_user["is_master"] == True
        assert self.admin_user["label"] == "Master Key"


class TestAuthEndpoints:
    """Basic auth endpoints test"""
    
    def test_login_with_admin_key(self):
        """Login with admin key succeeds"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["is_master"] == True
    
    def test_login_with_invalid_key(self):
        """Login with invalid key fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"key": "invalid-key"})
        assert response.status_code == 401
    
    def test_auth_me_endpoint(self):
        """GET /api/auth/me returns user info"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
        token = login_resp.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_master"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
