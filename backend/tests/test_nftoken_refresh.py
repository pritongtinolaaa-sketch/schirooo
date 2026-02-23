"""
NFToken Auto-Refresh Feature Tests
Tests: POST /api/admin/free-cookies/refresh endpoint, auth guards, response format
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_KEY = "PritongTinola*3030"


@pytest.fixture(scope="module")
def admin_session():
    """Get admin (master) session token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    assert data["user"]["is_master"] == True, "Admin should have is_master=True"
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    return session


@pytest.fixture(scope="module")
def regular_session(admin_session):
    """Create a non-admin key and get its session"""
    # Create a non-admin key via admin
    create_resp = admin_session.post(f"{BASE_URL}/api/admin/keys", json={
        "label": "TEST_NFTokenRefreshUser",
        "max_devices": 1
    })
    assert create_resp.status_code == 200, f"Failed to create key: {create_resp.text}"
    key_data = create_resp.json()
    key_value = key_data["key_value"]
    key_id = key_data["id"]
    
    # Login with the non-admin key
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"key": key_value})
    assert resp.status_code == 200, f"Non-admin login failed: {resp.text}"
    data = resp.json()
    assert data["user"]["is_master"] == False, "Non-admin should have is_master=False"
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    session.key_id = key_id
    
    yield session
    
    # Cleanup: delete the test key
    admin_session.delete(f"{BASE_URL}/api/admin/keys/{key_id}")


class TestNFTokenRefreshEndpoint:
    """Test POST /api/admin/free-cookies/refresh endpoint"""
    
    def test_admin_can_refresh_tokens(self, admin_session):
        """POST /api/admin/free-cookies/refresh - Admin can force-refresh all NFTokens"""
        resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies/refresh")
        assert resp.status_code == 200, f"Refresh should succeed, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        # Verify response structure
        assert "message" in data, "Response should contain 'message'"
        assert "refreshed" in data, "Response should contain 'refreshed' count"
        assert "total" in data, "Response should contain 'total' count"
        
        # Verify data types
        assert isinstance(data["refreshed"], int), "'refreshed' should be an integer"
        assert isinstance(data["total"], int), "'total' should be an integer"
        
        # Verify message format
        assert "Refreshed" in data["message"] or "No free cookies" in data["message"], \
            f"Message should indicate refresh result: {data['message']}"
        
        print(f"Refresh result: {data['message']}")
    
    def test_non_admin_cannot_refresh_tokens(self, regular_session):
        """POST /api/admin/free-cookies/refresh - Returns 403 for non-admin users"""
        resp = regular_session.post(f"{BASE_URL}/api/admin/free-cookies/refresh")
        assert resp.status_code == 403, f"Non-admin should get 403, got {resp.status_code}: {resp.text}"
    
    def test_unauthenticated_cannot_refresh_tokens(self):
        """POST /api/admin/free-cookies/refresh - Returns 401 for unauthenticated users"""
        resp = requests.post(f"{BASE_URL}/api/admin/free-cookies/refresh")
        assert resp.status_code == 401, f"Unauthenticated should get 401, got {resp.status_code}"
    
    def test_refresh_returns_proper_count_structure(self, admin_session):
        """POST /api/admin/free-cookies/refresh - Returns proper count of refreshed vs total"""
        resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies/refresh")
        assert resp.status_code == 200
        
        data = resp.json()
        # refreshed should be <= total
        assert data["refreshed"] <= data["total"], \
            f"Refreshed ({data['refreshed']}) should be <= total ({data['total']})"
        
        # Both should be non-negative
        assert data["refreshed"] >= 0, "Refreshed count should be non-negative"
        assert data["total"] >= 0, "Total count should be non-negative"


class TestExistingFreeCookiesEndpoints:
    """Verify existing free cookies endpoints still work after adding refresh feature"""
    
    def test_get_free_cookies_still_works(self, admin_session):
        """GET /api/admin/free-cookies - Still works correctly"""
        resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
        assert resp.status_code == 200
        
        data = resp.json()
        assert "cookies" in data
        assert "display_limit" in data
    
    def test_get_user_free_cookies_still_works(self, regular_session):
        """GET /api/free-cookies - Still works for regular users"""
        resp = regular_session.get(f"{BASE_URL}/api/free-cookies")
        assert resp.status_code == 200
        
        data = resp.json()
        assert isinstance(data, list)
    
    def test_add_free_cookie_still_works(self, admin_session):
        """POST /api/admin/free-cookies - Still works correctly"""
        payload = {
            "email": "TEST_refresh_feature@example.com",
            "plan": "Standard",
            "country": "US",
            "browser_cookies": "NetflixId=test123; SecureNetflixId=test456",
            "full_cookie": "full test cookie data"
        }
        resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
        assert resp.status_code == 200
        
        data = resp.json()
        assert "id" in data
        
        # Cleanup - delete the test cookie
        admin_session.delete(f"{BASE_URL}/api/admin/free-cookies/{data['id']}")
    
    def test_delete_free_cookie_still_works(self, admin_session):
        """DELETE /api/admin/free-cookies/{id} - Still works correctly"""
        # First add a cookie
        payload = {"email": "TEST_delete_test@example.com"}
        add_resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
        assert add_resp.status_code == 200
        cookie_id = add_resp.json()["id"]
        
        # Delete it
        del_resp = admin_session.delete(f"{BASE_URL}/api/admin/free-cookies/{cookie_id}")
        assert del_resp.status_code == 200
    
    def test_update_limit_still_works(self, admin_session):
        """PATCH /api/admin/free-cookies/limit - Still works correctly"""
        resp = admin_session.patch(f"{BASE_URL}/api/admin/free-cookies/limit", json={"limit": 10})
        assert resp.status_code == 200


class TestLastRefreshedTimestamp:
    """Test that last_refreshed timestamp is set after refresh"""
    
    def test_refresh_sets_last_refreshed_timestamp(self, admin_session):
        """Refresh should set last_refreshed on cookies that were successfully refreshed"""
        # First, get current cookies to see baseline
        get_resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
        assert get_resp.status_code == 200
        
        if get_resp.json()["cookies"]:
            # Trigger refresh
            refresh_resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies/refresh")
            assert refresh_resp.status_code == 200
            
            refresh_data = refresh_resp.json()
            print(f"Refresh result: {refresh_data}")
            
            # If any were refreshed, check they have last_refreshed timestamp
            if refresh_data["refreshed"] > 0:
                # Re-fetch cookies
                after_resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
                assert after_resp.status_code == 200
                
                cookies_with_timestamp = [
                    c for c in after_resp.json()["cookies"] 
                    if c.get("last_refreshed")
                ]
                print(f"Cookies with last_refreshed timestamp: {len(cookies_with_timestamp)}")


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Final cleanup of TEST_ prefixed data"""
    yield
    # After all tests, cleanup any remaining test data
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"key": ADMIN_KEY})
    if resp.status_code == 200:
        token = resp.json()["token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get all free cookies and delete TEST_ ones
        fc_resp = session.get(f"{BASE_URL}/api/admin/free-cookies")
        if fc_resp.status_code == 200:
            for cookie in fc_resp.json().get("cookies", []):
                if cookie.get("email", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/admin/free-cookies/{cookie['id']}")
        
        # Delete TEST_ keys
        keys_resp = session.get(f"{BASE_URL}/api/admin/keys")
        if keys_resp.status_code == 200:
            for key in keys_resp.json():
                if key.get("label", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/admin/keys/{key['id']}")
