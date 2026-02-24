#!/usr/bin/env python3
import requests
import sys
import json
import time
import os
from datetime import datetime

class DetailedAPITester:
    def __init__(self, base_url="https://cookie-checker.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        if files:
            headers.pop('Content-Type', None)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
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

    def test_login(self):
        """Test login with master key"""
        success, response = self.run_test(
            "Login with Master Key PritongTinola*3030",
            "POST",
            "auth/login",
            200,
            data={"key": "PritongTinola*3030"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:50]}...")
            return True
        return False

    def test_check_response_structure(self):
        """Test /check response has required fields: browser_cookies, nftoken, nftoken_link"""
        fake_cookies = """# Netscape HTTP Cookie File
.netflix.com	TRUE	/	FALSE	1735689600	NetflixId	fake_netflix_id_test123
.netflix.com	TRUE	/	TRUE	1735689600	SecureNetflixId	fake_secure_id_test456
.netflix.com	TRUE	/	FALSE	1735689600	nfvdid	fake_nfvdid_test789"""
        
        success, response = self.run_test(
            "Check Response Structure (browser_cookies, nftoken, nftoken_link)",
            "POST",
            "check",
            200,
            data={
                "cookies_text": fake_cookies,
                "format_type": "auto"
            }
        )
        
        if success:
            # Verify main response structure
            required_main_fields = ['id', 'results', 'total', 'valid_count', 'expired_count', 'invalid_count']
            missing_main = [f for f in required_main_fields if f not in response]
            if missing_main:
                print(f"❌ Missing main fields: {missing_main}")
                return False
            
            # Verify result structure
            if not response['results']:
                print("❌ No results returned")
                return False
                
            result = response['results'][0]
            required_result_fields = ['status', 'browser_cookies', 'nftoken', 'nftoken_link', 'full_cookie']
            missing_result = [f for f in required_result_fields if f not in result]
            if missing_result:
                print(f"❌ Missing result fields: {missing_result}")
                return False
            
            print(f"✅ All required fields present:")
            print(f"   - browser_cookies: {type(result['browser_cookies'])} ({'empty' if not result['browser_cookies'] else 'has data'})")
            print(f"   - nftoken: {type(result['nftoken'])} ({'null' if result['nftoken'] is None else 'has value'})")
            print(f"   - nftoken_link: {type(result['nftoken_link'])} ({'null' if result['nftoken_link'] is None else 'has value'})")
            print(f"   - full_cookie: present ✓")
            print(f"   - Country field: {result.get('country', 'Not present')}")
            
            return True
        return False

    def test_nftoken_endpoint_detailed(self):
        """Test /nftoken endpoint with detailed response validation"""
        fake_cookies = """NetflixId=fake_test_id_123; SecureNetflixId=fake_secure_test_456; nfvdid=fake_vdid_789"""
        
        success, response = self.run_test(
            "NFToken Endpoint Detailed Response",
            "POST",
            "nftoken",
            200,
            data={
                "cookies_text": fake_cookies,
                "format_type": "auto"
            }
        )
        
        if success:
            required_fields = ['success', 'nftoken']
            missing = [f for f in required_fields if f not in response]
            if missing:
                print(f"❌ Missing required fields: {missing}")
                return False
            
            print(f"✅ NFToken response structure:")
            print(f"   - success: {response['success']}")
            print(f"   - nftoken: {response['nftoken']}")
            if 'error' in response:
                print(f"   - error: {response['error']}")
            if 'link' in response:
                print(f"   - link: {response['link']}")
            
            return True
        return False

    def test_file_upload_detailed(self):
        """Test file upload with detailed response validation"""
        cookie_content = """# Test Netflix Cookies
.netflix.com	TRUE	/	FALSE	1735689600	NetflixId	file_test_netflixid_999
.netflix.com	TRUE	/	TRUE	1735689600	SecureNetflixId	file_test_secure_888
.netflix.com	TRUE	/	FALSE	1735689600	nfvdid	file_test_nfvdid_777"""
        
        success, response = self.run_test(
            "File Upload with Required Fields",
            "POST",
            "check/file",
            200,
            files={'file': ('test_cookies.txt', cookie_content, 'text/plain')}
        )
        
        if success and response.get('results'):
            result = response['results'][0]
            required_fields = ['browser_cookies', 'nftoken', 'nftoken_link']
            missing = [f for f in required_fields if f not in result]
            if missing:
                print(f"❌ File upload missing fields: {missing}")
                return False
            
            print(f"✅ File upload has all required fields:")
            for field in required_fields:
                print(f"   - {field}: ✓")
            
            return True
        return False

def main():
    print("🔍 Detailed Netflix Cookie Checker API Tests")
    print("Testing specific features from review request")
    print("=" * 60)
    
    tester = DetailedAPITester()

    # Test sequence focusing on review requirements
    tests = [
        ("Login with PritongTinola*3030", tester.test_login),
        ("Check Response Structure", tester.test_check_response_structure),
        ("NFToken Endpoint", tester.test_nftoken_endpoint_detailed),
        ("File Upload", tester.test_file_upload_detailed),
    ]

    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
                print(f"❌ {test_name} FAILED")
            else:
                print(f"✅ {test_name} PASSED")
        except Exception as e:
            print(f"💥 {test_name} CRASHED: {e}")
            failed_tests.append(f"{test_name} (crashed)")

    # Summary
    print("\n" + "=" * 60)
    print("📊 DETAILED TEST SUMMARY")
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
        print(f"\n✅ All detailed tests passed!")
        print(f"\n🎯 Key Features Verified:")
        print(f"  ✓ Login with master key works")
        print(f"  ✓ /api/check returns browser_cookies, nftoken, nftoken_link fields")
        print(f"  ✓ /api/nftoken endpoint works correctly")
        print(f"  ✓ /api/check/file works with file upload")
        return 0

if __name__ == "__main__":
    sys.exit(main())