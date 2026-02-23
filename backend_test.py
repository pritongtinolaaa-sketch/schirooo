#!/usr/bin/env python3
import requests
import sys
import json
import time
import os
from datetime import datetime

class SchiroCookieCheckerAPITester:
    def __init__(self, base_url="https://valid-cookies-log.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_info = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        # For file upload, don't set content-type
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

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, access_key):
        """Test login with master key"""
        success, response = self.run_test(
            "Login with Master Key",
            "POST",
            "auth/login",
            200,
            data={"key": access_key}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_info = response.get('user', {})
            print(f"   Logged in as: {self.user_info.get('label')} (Master: {self.user_info.get('is_master')})")
            return True
        return False

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_check_cookies_paste(self):
        """Test POST /check with fake cookie text"""
        # Test with fake Netflix cookies (will return expired/invalid but should work)
        fake_cookies = """# Netscape HTTP Cookie File
.netflix.com	TRUE	/	FALSE	1735689600	NetflixId	fake_netflix_id_12345
.netflix.com	TRUE	/	TRUE	1735689600	SecureNetflixId	fake_secure_id_67890
.netflix.com	TRUE	/	FALSE	1735689600	nfvdid	fake_nfvdid_abc123"""
        
        success, response = self.run_test(
            "Check Cookies (Paste)",
            "POST",
            "check",
            200,
            data={
                "cookies_text": fake_cookies,
                "format_type": "auto"
            }
        )
        if success:
            # Check response structure
            required_fields = ['id', 'results', 'total', 'valid_count', 'expired_count', 'invalid_count']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
            
            # Check first result structure
            if response['results']:
                result = response['results'][0]
                expected_result_fields = ['status', 'browser_cookies', 'nftoken', 'nftoken_link', 'full_cookie']
                for field in expected_result_fields:
                    if field not in result:
                        print(f"❌ Missing result field: {field}")
                        return False
            
            print(f"   Results: {response['total']} total, {response['valid_count']} valid, {response['expired_count']} expired, {response['invalid_count']} invalid")
            return True
        return False

    def test_check_cookies_file(self):
        """Test POST /check/file with file upload"""
        # Create a temporary cookie file
        cookie_content = """# Test cookie file
.netflix.com	TRUE	/	FALSE	1735689600	NetflixId	file_test_id_12345
.netflix.com	TRUE	/	TRUE	1735689600	SecureNetflixId	file_secure_id_67890"""
        
        success, response = self.run_test(
            "Check Cookies (File Upload)",
            "POST",
            "check/file",
            200,
            files={'file': ('test_cookies.txt', cookie_content, 'text/plain')}
        )
        if success:
            # Check response structure (same as paste)
            required_fields = ['id', 'results', 'total', 'valid_count', 'expired_count', 'invalid_count']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
            print(f"   File Results: {response['total']} total, {response['valid_count']} valid, {response['expired_count']} expired, {response['invalid_count']} invalid")
            return True
        return False

    def test_nftoken_endpoint(self):
        """Test POST /nftoken endpoint"""
        fake_cookies = """NetflixId=fake_id; SecureNetflixId=fake_secure; nfvdid=fake_vdid"""
        
        success, response = self.run_test(
            "Generate NFToken",
            "POST",
            "nftoken",
            200,
            data={
                "cookies_text": fake_cookies,
                "format_type": "auto"
            }
        )
        if success:
            # Check response structure
            required_fields = ['success', 'nftoken']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
            
            # With fake cookies, we expect success=False and error
            if response['success']:
                print(f"   NFToken: {response['nftoken']}")
            else:
                print(f"   Expected failure with fake cookies: {response.get('error', 'No error message')}")
            return True
        return False

    def test_history(self):
        """Test GET /history endpoint"""
        success, response = self.run_test(
            "Get Check History",
            "GET",
            "history",
            200
        )
        if success:
            print(f"   History entries: {len(response) if isinstance(response, list) else 'Invalid format'}")
            return True
        return False

    def test_admin_keys_list(self):
        """Test admin functionality - list keys"""
        success, response = self.run_test(
            "Admin - List Keys",
            "GET",
            "admin/keys",
            200
        )
        if success:
            print(f"   Keys found: {len(response) if isinstance(response, list) else 'Invalid format'}")
            return True
        return False

    def test_admin_create_key(self):
        """Test admin functionality - create new key"""
        success, response = self.run_test(
            "Admin - Create Key",
            "POST",
            "admin/keys",
            200,
            data={
                "label": f"Test Key {int(time.time())}",
                "max_devices": 2
            }
        )
        if success and 'key_value' in response:
            print(f"   Created key: {response['key_value'][:8]}****")
            # Store for cleanup
            self.test_key_id = response.get('id')
            return True
        return False

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting Schiro Cookie Checker API Tests")
    print("=" * 60)
    
    # Setup
    tester = SchiroCookieCheckerAPITester()
    master_key = "PritongTinola*3030"

    # Test sequence
    test_functions = [
        ("Login", lambda: tester.test_login(master_key)),
        ("Auth Me", tester.test_auth_me),
        ("Check Cookies (Paste)", tester.test_check_cookies_paste),
        ("Check Cookies (File)", tester.test_check_cookies_file),
        ("NFToken Generation", tester.test_nftoken_endpoint),
        ("History", tester.test_history),
        ("Admin - List Keys", tester.test_admin_keys_list),
        ("Admin - Create Key", tester.test_admin_create_key),
        ("Logout", tester.test_logout),
    ]

    failed_tests = []

    for test_name, test_func in test_functions:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {str(e)}")
            failed_tests.append(f"{test_name} (crashed)")

    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  - {test}")
        return 1
    else:
        print(f"\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())