import requests
import sys
import json
from datetime import datetime

class SchiroCookieCheckerTester:
    def __init__(self, base_url="https://cookie-checker.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.is_master = False

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        # Remove content-type for file uploads
        if files:
            headers.pop('Content-Type', None)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_details = response.json()
                    print(f"   Error: {error_details}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out after 30 seconds")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_key_login(self, access_key):
        """Test user login with access key"""
        success, response = self.run_test(
            "Key-based Login",
            "POST",
            "auth/login",
            200,
            data={"key": access_key}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            self.is_master = response.get('user', {}).get('is_master', False)
            print(f"   Token obtained: {self.token[:20]}...")
            print(f"   User: {response.get('user', {}).get('label')} (Master: {self.is_master})")
            return True
        return False
    
    def test_invalid_key_login(self):
        """Test login with invalid key"""
        success, response = self.run_test(
            "Invalid Key Login",
            "POST",
            "auth/login",
            401,
            data={"key": "invalid_key_123"}
        )
        return success
        
    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        return success
    
    def test_get_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET", 
            "auth/me",
            200
        )
        if success:
            print(f"   User info: {response}")
            return True
        return False
    
    # Admin Key Management Tests
    def test_create_key(self, label, max_devices=1):
        """Test creating new access key (admin only)"""
        success, response = self.run_test(
            "Create Access Key",
            "POST",
            "admin/keys",
            200,
            data={"label": label, "max_devices": max_devices}
        )
        if success:
            print(f"   Created key: {response.get('key_value', 'N/A')}")
            return response
        return None
        
    def test_list_keys(self):
        """Test listing all access keys (admin only)"""
        success, response = self.run_test(
            "List Access Keys",
            "GET", 
            "admin/keys",
            200
        )
        if success:
            print(f"   Found {len(response)} keys")
            return response
        return []
        
    def test_reveal_key(self, key_id):
        """Test revealing full key value (admin only)"""
        success, response = self.run_test(
            "Reveal Key Value",
            "GET",
            f"admin/keys/{key_id}/reveal",
            200
        )
        if success:
            print(f"   Full key: {response.get('key_value', 'N/A')}")
            return response
        return None
        
    def test_delete_key(self, key_id):
        """Test deleting access key (admin only)"""
        success, response = self.run_test(
            "Delete Access Key",
            "DELETE",
            f"admin/keys/{key_id}",
            200
        )
        return success
        
    def test_revoke_session(self, key_id, session_id):
        """Test revoking a session (admin only)"""
        success, response = self.run_test(
            "Revoke Session",
            "DELETE",
            f"admin/keys/{key_id}/sessions/{session_id}",
            200
        )
        return success
        
    def test_non_admin_access(self):
        """Test that non-admin users cannot access admin endpoints"""
        # Should fail with 403 for non-admin users
        expected_status = 403 if not self.is_master else 200
        success, response = self.run_test(
            "Admin Access Check",
            "GET",
            "admin/keys",
            expected_status
        )
        return success

    def test_check_cookies_paste(self, cookies_text, format_type="auto"):
        """Test cookie checking via paste"""
        success, response = self.run_test(
            "Cookie Check - Paste",
            "POST",
            "check", 
            200,
            data={"cookies_text": cookies_text, "format_type": format_type}
        )
        if success:
            print(f"   Check results: Total={response.get('total')}, Valid={response.get('valid_count')}, Expired={response.get('expired_count')}, Invalid={response.get('invalid_count')}")
            return response.get('id')
        return None

    def test_check_cookies_file(self, file_content):
        """Test cookie checking via file upload"""
        # Create a text file in memory
        files = {'file': ('cookies.txt', file_content, 'text/plain')}
        
        success, response = self.run_test(
            "Cookie Check - File Upload",
            "POST",
            "check/file",
            200,
            files=files
        )
        if success:
            print(f"   Check results: Total={response.get('total')}, Valid={response.get('valid_count')}, Expired={response.get('expired_count')}, Invalid={response.get('invalid_count')}")
            return response.get('id')
        return None

    def test_get_history(self):
        """Test getting check history"""
        success, response = self.run_test(
            "Get Check History",
            "GET",
            "history",
            200
        )
        if success:
            print(f"   History items: {len(response)} checks")
            return response
        return []

    def test_delete_history(self, check_id):
        """Test deleting a check from history"""
        success, response = self.run_test(
            "Delete Check",
            "DELETE",
            f"history/{check_id}",
            200
        )
        return success

    def test_invalid_auth(self):
        """Test endpoints without authentication"""
        old_token = self.token
        self.token = None
        
        # Test protected endpoint without token
        success, _ = self.run_test(
            "Protected Endpoint - No Auth",
            "GET",
            "auth/me",
            401
        )
        
        # Test with invalid token
        self.token = "invalid_token_12345"
        success2, _ = self.run_test(
            "Protected Endpoint - Invalid Auth",
            "GET", 
            "auth/me",
            401
        )
        
        self.token = old_token
        return success and success2

def main():
    print("🚀 Starting Schiro Cookie Checker API Tests (Key-based Auth)")
    print("=" * 70)
    
    # Setup
    tester = SchiroCookieCheckerTester()
    master_key = "PritongTinola*3030"
    test_key = "NzvDibu4vX-_rHoE-dxYQQ"

    # Sample cookie data (will be expired/invalid but tests the parsing)
    sample_cookies = '''# Netscape HTTP Cookie File
www.netflix.com TRUE    /       FALSE   1234567890      nftoken sample_token_value
www.netflix.com TRUE    /       FALSE   1234567890      SecureNetflixId sample_secure_id'''

    sample_json_cookies = '''[
    {"name": "nftoken", "value": "sample_token", "domain": "netflix.com"},
    {"name": "SecureNetflixId", "value": "sample_id", "domain": "netflix.com"}
]'''

    check_ids = []
    created_key_id = None

    try:
        # Test 1: Master Key Login
        print("\n" + "="*60)
        print("TESTING MASTER KEY LOGIN")
        print("="*60)
        if not tester.test_key_login(master_key):
            print("❌ Master key login failed, stopping tests")
            return 1

        # Test 2: Auth endpoints
        print("\n" + "="*60)
        print("TESTING AUTH ENDPOINTS")
        print("="*60)
        
        if not tester.test_get_me():
            print("❌ Get current user failed")
            
        # Test logout (will need to re-login)
        tester.test_logout()
        
        # Re-login for remaining tests
        if not tester.test_key_login(master_key):
            print("❌ Re-login failed after logout test")
            return 1

        # Test 3: Invalid auth
        print("\n" + "="*60)
        print("TESTING INVALID AUTH")
        print("="*60)
        
        if not tester.test_invalid_key_login():
            print("❌ Invalid key test failed")
            
        if not tester.test_invalid_auth():
            print("❌ Invalid auth tests failed")

        # Test 4: Admin Key Management
        print("\n" + "="*60)
        print("TESTING ADMIN KEY MANAGEMENT")
        print("="*60)
        
        # List existing keys
        existing_keys = tester.test_list_keys()
        
        # Create a new key
        new_key = tester.test_create_key("Test API Key", 2)
        if new_key:
            created_key_id = new_key.get('id')
            
        # Reveal key
        if created_key_id:
            tester.test_reveal_key(created_key_id)
        
        # Test admin access control
        tester.test_non_admin_access()

        # Test 5: Regular User Login
        print("\n" + "="*60)
        print("TESTING REGULAR USER KEY LOGIN")
        print("="*60)
        
        # Logout as admin
        tester.test_logout()
        
        # Login with regular test key
        if not tester.test_key_login(test_key):
            print("❌ Test key login failed")
        else:
            # Test that regular user cannot access admin endpoints
            tester.test_non_admin_access()
        
        # Re-login as admin for remaining tests
        tester.test_logout()
        tester.test_key_login(master_key)

        # Test 6: Cookie checking - Paste
        print("\n" + "="*60)
        print("TESTING COOKIE CHECKING - PASTE")
        print("="*60)
        
        check_id1 = tester.test_check_cookies_paste(sample_cookies, "netscape")
        if check_id1:
            check_ids.append(check_id1)

        check_id2 = tester.test_check_cookies_paste(sample_json_cookies, "json")
        if check_id2:
            check_ids.append(check_id2)

        # Test auto format detection
        check_id3 = tester.test_check_cookies_paste(sample_cookies, "auto")
        if check_id3:
            check_ids.append(check_id3)

        # Test 7: Cookie checking - File upload
        print("\n" + "="*60)
        print("TESTING COOKIE CHECKING - FILE UPLOAD")
        print("="*60)
        
        check_id4 = tester.test_check_cookies_file(sample_cookies)
        if check_id4:
            check_ids.append(check_id4)

        # Test 8: History endpoints
        print("\n" + "="*60)
        print("TESTING HISTORY ENDPOINTS")  
        print("="*60)
        
        history = tester.test_get_history()
        
        # Test delete if we have check IDs
        if check_ids:
            tester.test_delete_history(check_ids[0])

        # Test 9: Error cases
        print("\n" + "="*60)
        print("TESTING ERROR CASES")
        print("="*60)
        
        # Empty cookie text
        tester.run_test("Empty Cookies", "POST", "check", 400, 
                       data={"cookies_text": "", "format_type": "auto"})
        
        # Delete non-existent check
        tester.run_test("Delete Non-existent Check", "DELETE", "history/fake-id", 404)
        
        # Try to delete master key (should fail)
        if existing_keys:
            master_key_item = next((k for k in existing_keys if k.get('is_master')), None)
            if master_key_item:
                tester.run_test("Delete Master Key (Should Fail)", "DELETE", 
                              f"admin/keys/{master_key_item['id']}", 400)

        # Test 10: Cleanup - Delete created test key
        if created_key_id:
            print("\n" + "="*60)
            print("CLEANUP - DELETING TEST KEY")
            print("="*60)
            tester.test_delete_key(created_key_id)

    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")
        return 1

    # Print final results
    print("\n" + "="*70)
    print("🏁 SCHIRO COOKIE CHECKER TEST RESULTS")
    print("="*70)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())