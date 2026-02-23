"""
Free Cookies Feature Backend Tests
Tests: Admin CRUD for free cookies, display limit, and user access
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
        "label": "TEST_FreeCookiesUser",
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
    session.key_id = key_id  # Store for cleanup
    
    yield session
    
    # Cleanup: delete the test key
    admin_session.delete(f"{BASE_URL}/api/admin/keys/{key_id}")

@pytest.fixture
def cleanup_test_cookies(admin_session):
    """Fixture to cleanup test free cookies after tests"""
    created_ids = []
    yield created_ids
    # Cleanup all test cookies
    for cookie_id in created_ids:
        admin_session.delete(f"{BASE_URL}/api/admin/free-cookies/{cookie_id}")


class TestFreeCookiesAdminAPI:
    """Test admin free-cookies endpoints"""
    
    def test_admin_add_free_cookie(self, admin_session, cleanup_test_cookies):
        """POST /api/admin/free-cookies - Admin can add a free cookie"""
        payload = {
            "email": "TEST_free@example.com",
            "plan": "Premium",
            "country": "US",
            "member_since": "2020-01-01",
            "next_billing": "2024-02-01",
            "profiles": ["Profile1", "Profile2"],
            "browser_cookies": "NetflixId=abc123; SecureNetflixId=xyz789",
            "full_cookie": "FULL_COOKIE_DATA",
            "nftoken": "test-nftoken-12345",
            "nftoken_link": "https://netflix.com/?nftoken=test-nftoken-12345"
        }
        resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
        assert resp.status_code == 200, f"Failed to add free cookie: {resp.text}"
        
        data = resp.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["message"] == "Free cookie added", "Should confirm addition"
        
        cleanup_test_cookies.append(data["id"])
    
    def test_admin_get_all_free_cookies(self, admin_session, cleanup_test_cookies):
        """GET /api/admin/free-cookies - Admin gets all free cookies with display_limit"""
        # First add a test cookie
        payload = {
            "email": "TEST_getall@example.com",
            "plan": "Standard",
            "country": "UK"
        }
        add_resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
        assert add_resp.status_code == 200
        cleanup_test_cookies.append(add_resp.json()["id"])
        
        # Get all free cookies
        resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
        assert resp.status_code == 200, f"Failed to get free cookies: {resp.text}"
        
        data = resp.json()
        assert "cookies" in data, "Response should contain 'cookies' array"
        assert "display_limit" in data, "Response should contain 'display_limit'"
        assert isinstance(data["cookies"], list), "'cookies' should be a list"
        assert isinstance(data["display_limit"], int), "'display_limit' should be an integer"
    
    def test_admin_delete_free_cookie(self, admin_session):
        """DELETE /api/admin/free-cookies/{id} - Admin can delete individual free cookie"""
        # First add a cookie to delete
        payload = {"email": "TEST_delete@example.com", "plan": "Basic"}
        add_resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
        assert add_resp.status_code == 200
        cookie_id = add_resp.json()["id"]
        
        # Delete the cookie
        del_resp = admin_session.delete(f"{BASE_URL}/api/admin/free-cookies/{cookie_id}")
        assert del_resp.status_code == 200, f"Failed to delete free cookie: {del_resp.text}"
        assert del_resp.json()["message"] == "Free cookie deleted"
        
        # Verify deletion - GET should not include the deleted cookie
        get_resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
        cookies = get_resp.json()["cookies"]
        cookie_ids = [c["id"] for c in cookies]
        assert cookie_id not in cookie_ids, "Deleted cookie should not appear in list"
    
    def test_admin_delete_nonexistent_cookie(self, admin_session):
        """DELETE /api/admin/free-cookies/{id} - Returns 404 for non-existent cookie"""
        resp = admin_session.delete(f"{BASE_URL}/api/admin/free-cookies/nonexistent-id-12345")
        assert resp.status_code == 404, "Should return 404 for non-existent cookie"
    
    def test_admin_set_display_limit(self, admin_session):
        """PATCH /api/admin/free-cookies/limit - Admin can set display limit"""
        resp = admin_session.patch(f"{BASE_URL}/api/admin/free-cookies/limit", json={"limit": 5})
        assert resp.status_code == 200, f"Failed to set limit: {resp.text}"
        
        data = resp.json()
        assert data["message"] == "Limit updated"
        assert data["limit"] == 5
        
        # Verify the limit is persisted
        get_resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
        assert get_resp.json()["display_limit"] == 5


class TestFreeCookiesUserAPI:
    """Test user access to free-cookies"""
    
    def test_authenticated_user_get_free_cookies(self, regular_session):
        """GET /api/free-cookies - Authenticated users get free cookies"""
        resp = regular_session.get(f"{BASE_URL}/api/free-cookies")
        assert resp.status_code == 200, f"Failed to get free cookies: {resp.text}"
        
        data = resp.json()
        assert isinstance(data, list), "Response should be a list of cookies"
    
    def test_user_cannot_access_admin_free_cookies_list(self, regular_session):
        """GET /api/admin/free-cookies - Non-admin cannot access admin endpoint"""
        resp = regular_session.get(f"{BASE_URL}/api/admin/free-cookies")
        assert resp.status_code == 403, f"Non-admin should get 403, got {resp.status_code}"
    
    def test_user_cannot_add_free_cookie(self, regular_session):
        """POST /api/admin/free-cookies - Non-admin cannot add free cookies"""
        payload = {"email": "hacker@example.com", "plan": "Premium"}
        resp = regular_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
        assert resp.status_code == 403, f"Non-admin should get 403, got {resp.status_code}"
    
    def test_user_cannot_delete_free_cookie(self, regular_session):
        """DELETE /api/admin/free-cookies/{id} - Non-admin cannot delete free cookies"""
        resp = regular_session.delete(f"{BASE_URL}/api/admin/free-cookies/any-id")
        assert resp.status_code == 403, f"Non-admin should get 403, got {resp.status_code}"
    
    def test_user_cannot_set_limit(self, regular_session):
        """PATCH /api/admin/free-cookies/limit - Non-admin cannot set limit"""
        resp = regular_session.patch(f"{BASE_URL}/api/admin/free-cookies/limit", json={"limit": 100})
        assert resp.status_code == 403, f"Non-admin should get 403, got {resp.status_code}"


class TestDisplayLimitFunctionality:
    """Test that display limit actually limits cookies for users"""
    
    def test_display_limit_applied_to_user_endpoint(self, admin_session, regular_session, cleanup_test_cookies):
        """Verify display_limit restricts cookies returned to users"""
        # Add 3 test cookies
        for i in range(3):
            payload = {"email": f"TEST_limit{i}@example.com", "plan": "Test"}
            resp = admin_session.post(f"{BASE_URL}/api/admin/free-cookies", json=payload)
            assert resp.status_code == 200
            cleanup_test_cookies.append(resp.json()["id"])
        
        # Set display limit to 1
        limit_resp = admin_session.patch(f"{BASE_URL}/api/admin/free-cookies/limit", json={"limit": 1})
        assert limit_resp.status_code == 200
        
        # User should get at most 1 cookie
        user_resp = regular_session.get(f"{BASE_URL}/api/free-cookies")
        assert user_resp.status_code == 200
        user_cookies = user_resp.json()
        assert len(user_cookies) <= 1, f"User should get at most 1 cookie due to limit, got {len(user_cookies)}"
        
        # Admin should see all cookies (no limit applied to admin view)
        admin_resp = admin_session.get(f"{BASE_URL}/api/admin/free-cookies")
        assert len(admin_resp.json()["cookies"]) >= 3, "Admin should see all cookies"
        
        # Reset limit to higher value
        admin_session.patch(f"{BASE_URL}/api/admin/free-cookies/limit", json={"limit": 10})


class TestMasterKeyDeviceLimit:
    """Test that master key has unlimited devices"""
    
    def test_master_key_unlimited_devices(self):
        """Master key login succeeds regardless of device count"""
        # Login with master key multiple times - should always succeed
        sessions = []
        for i in range(5):  # Try 5 concurrent sessions
            resp = requests.post(
                f"{BASE_URL}/api/auth/login", 
                json={"key": ADMIN_KEY},
                headers={"Content-Type": "application/json"}
            )
            assert resp.status_code == 200, f"Master key login {i+1} should succeed, got {resp.status_code}: {resp.text}"
            sessions.append(resp.json()["token"])
        
        # All 5 logins should have succeeded
        assert len(sessions) == 5, "Master key should allow unlimited sessions"


class TestUnauthenticatedAccess:
    """Test that unauthenticated users cannot access free cookies"""
    
    def test_unauthenticated_cannot_access_free_cookies(self):
        """GET /api/free-cookies - Unauthenticated users get 401"""
        resp = requests.get(f"{BASE_URL}/api/free-cookies")
        assert resp.status_code == 401, f"Unauthenticated should get 401, got {resp.status_code}"
    
    def test_unauthenticated_cannot_access_admin_free_cookies(self):
        """GET /api/admin/free-cookies - Unauthenticated users get 401"""
        resp = requests.get(f"{BASE_URL}/api/admin/free-cookies")
        assert resp.status_code == 401, f"Unauthenticated should get 401, got {resp.status_code}"


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_all_test_data():
    """Final cleanup of all TEST_ prefixed data"""
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
