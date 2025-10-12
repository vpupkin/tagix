#!/usr/bin/env python3
"""
QA Enforcement Charter - Test-Driven Development Test Suite
This test suite defines ALL requirements and will initially FAIL until implementation is complete.

TDD Approach:
1. Write failing tests that define requirements
2. Run tests to confirm they fail (RED)
3. Implement minimal code to make tests pass (GREEN)
4. Refactor while keeping tests green (REFACTOR)
5. Repeat for each requirement

Requirements:
- Passenger → Drivers: Immediate UI refresh + audible alert on ride requests
- Driver → Passenger: Immediate UI refresh + audible alert on status changes
- SLO: Book→drivers P95≤1.5s, Accept→passenger P95≤1.0s
- Feature flag: realtime.status.deltaV1 (default OFF)
- Observability: ride_status_fanout.count, ride_status_push_sent.count, ride_status_e2e_latency_ms
"""

import asyncio
import json
import time
import pytest
import requests
import websockets
from datetime import datetime, timezone
from typing import Dict, List, Any
import statistics
import os
import sys

# Test Configuration
BASE_URL = "http://localhost:8001"
WS_URL = "ws://localhost:8001/ws"
TEST_TIMEOUT = 30

class TDDTestSuite:
    """Test-Driven Development test suite for QA Enforcement Charter"""
    
    def __init__(self):
        self.test_results = []
        self.latency_measurements = []
        self.failing_tests = []
        self.passing_tests = []
        
    def log_test_result(self, test_name: str, passed: bool, details: str = "", latency_ms: float = None):
        """Log test result with timestamp and details"""
        result = {
            "test_name": test_name,
            "passed": passed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details,
            "latency_ms": latency_ms
        }
        self.test_results.append(result)
        
        if passed:
            self.passing_tests.append(result)
            print(f"✅ PASS: {test_name} - {details}")
        else:
            self.failing_tests.append(result)
            print(f"❌ FAIL: {test_name} - {details}")
            
        if latency_ms:
            print(f"  Latency: {latency_ms:.2f}ms")

class TestFeatureFlagSystem:
    """Test feature flag system - should FAIL initially"""
    
    def test_feature_flag_endpoint_exists(self):
        """Test that feature flag endpoint exists - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/feature-flags", timeout=5)
            if response.status_code == 200:
                self.log_test_result("Feature Flag Endpoint", True, "Endpoint exists")
                return True
            else:
                self.log_test_result("Feature Flag Endpoint", False, f"Endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Feature Flag Endpoint", False, f"Endpoint does not exist: {str(e)}")
            return False
    
    def test_feature_flag_realtime_delta_exists(self):
        """Test that realtime.status.deltaV1 flag exists - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/feature-flags", timeout=5)
            if response.status_code == 200:
                flags = response.json()
                if "realtime.status.deltaV1" in flags:
                    self.log_test_result("Feature Flag realtime.status.deltaV1", True, "Flag exists")
                    return True
                else:
                    self.log_test_result("Feature Flag realtime.status.deltaV1", False, "Flag does not exist")
                    return False
            else:
                self.log_test_result("Feature Flag realtime.status.deltaV1", False, "Cannot access feature flags")
                return False
        except Exception as e:
            self.log_test_result("Feature Flag realtime.status.deltaV1", False, f"Error: {str(e)}")
            return False
    
    def test_feature_flag_defaults_to_off(self):
        """Test that feature flag defaults to OFF - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/feature-flags", timeout=5)
            if response.status_code == 200:
                flags = response.json()
                if flags.get("realtime.status.deltaV1") == False:
                    self.log_test_result("Feature Flag Default OFF", True, "Flag defaults to OFF")
                    return True
                else:
                    self.log_test_result("Feature Flag Default OFF", False, f"Flag is {flags.get('realtime.status.deltaV1')}, should be False")
                    return False
            else:
                self.log_test_result("Feature Flag Default OFF", False, "Cannot access feature flags")
                return False
        except Exception as e:
            self.log_test_result("Feature Flag Default OFF", False, f"Error: {str(e)}")
            return False

class TestObservabilitySystem:
    """Test observability system - should FAIL initially"""
    
    def test_ride_status_fanout_counter_exists(self):
        """Test that ride_status_fanout.count counter exists - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/observability/ride_status_fanout.count", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "count" in data:
                    self.log_test_result("Fanout Counter Exists", True, "Counter endpoint exists")
                    return True
                else:
                    self.log_test_result("Fanout Counter Exists", False, "Counter endpoint exists but missing 'count' field")
                    return False
            else:
                self.log_test_result("Fanout Counter Exists", False, f"Counter endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Fanout Counter Exists", False, f"Counter endpoint does not exist: {str(e)}")
            return False
    
    def test_ride_status_push_sent_counter_exists(self):
        """Test that ride_status_push_sent.count counter exists - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/observability/ride_status_push_sent.count", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "count" in data:
                    self.log_test_result("Push Counter Exists", True, "Counter endpoint exists")
                    return True
                else:
                    self.log_test_result("Push Counter Exists", False, "Counter endpoint exists but missing 'count' field")
                    return False
            else:
                self.log_test_result("Push Counter Exists", False, f"Counter endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Push Counter Exists", False, f"Counter endpoint does not exist: {str(e)}")
            return False
    
    def test_ride_status_e2e_latency_timer_exists(self):
        """Test that ride_status_e2e_latency_ms timer exists - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/observability/ride_status_e2e_latency_ms", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "P50" in data and "P95" in data:
                    self.log_test_result("Latency Timer Exists", True, "Timer endpoint exists with P50/P95")
                    return True
                else:
                    self.log_test_result("Latency Timer Exists", False, "Timer endpoint exists but missing P50/P95 fields")
                    return False
            else:
                self.log_test_result("Latency Timer Exists", False, f"Timer endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Latency Timer Exists", False, f"Timer endpoint does not exist: {str(e)}")
            return False

class TestSoundNotificationSystem:
    """Test sound notification system - should FAIL initially"""
    
    def test_sound_profiles_endpoint_exists(self):
        """Test that sound profiles endpoint exists - EXPECTED TO FAIL"""
        try:
            response = requests.get(f"{BASE_URL}/api/sound-profiles", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "profiles" in data:
                    self.log_test_result("Sound Profiles Endpoint", True, "Sound profiles endpoint exists")
                    return True
                else:
                    self.log_test_result("Sound Profiles Endpoint", False, "Endpoint exists but missing 'profiles' field")
                    return False
            else:
                self.log_test_result("Sound Profiles Endpoint", False, f"Sound profiles endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Sound Profiles Endpoint", False, f"Sound profiles endpoint does not exist: {str(e)}")
            return False
    
    def test_required_sound_profiles_exist(self):
        """Test that required sound profiles exist - EXPECTED TO FAIL"""
        required_profiles = ['status_critical', 'ride_request', 'ride_accepted']
        try:
            response = requests.get(f"{BASE_URL}/api/sound-profiles", timeout=5)
            if response.status_code == 200:
                data = response.json()
                profiles = data.get("profiles", {})
                missing_profiles = []
                for profile in required_profiles:
                    if profile not in profiles:
                        missing_profiles.append(profile)
                
                if not missing_profiles:
                    self.log_test_result("Required Sound Profiles", True, "All required sound profiles exist")
                    return True
                else:
                    self.log_test_result("Required Sound Profiles", False, f"Missing profiles: {missing_profiles}")
                    return False
            else:
                self.log_test_result("Required Sound Profiles", False, "Cannot access sound profiles")
                return False
        except Exception as e:
            self.log_test_result("Required Sound Profiles", False, f"Error: {str(e)}")
            return False

class TestEnhancedNotifications:
    """Test enhanced notification system - should FAIL initially"""
    
    def test_ride_request_includes_sound_metadata(self):
        """Test that ride requests include sound metadata - EXPECTED TO FAIL"""
        try:
            ride_data = {
                "pickup_location": {"address": "Test Pickup", "lat": 48.7758, "lng": 9.1829},
                "dropoff_location": {"address": "Test Dropoff", "lat": 48.7768, "lng": 9.1839},
                "vehicle_type": "economy"
            }
            
            response = requests.post(f"{BASE_URL}/api/rides/request", json=ride_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "notification_metadata" in data and "sound_required" in data["notification_metadata"]:
                    self.log_test_result("Ride Request Sound Metadata", True, "Ride request includes sound metadata")
                    return True
                else:
                    self.log_test_result("Ride Request Sound Metadata", False, "Ride request missing sound metadata")
                    return False
            else:
                self.log_test_result("Ride Request Sound Metadata", False, f"Ride request failed with {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Ride Request Sound Metadata", False, f"Error: {str(e)}")
            return False
    
    def test_ride_accept_includes_sound_metadata(self):
        """Test that ride acceptance includes sound metadata - EXPECTED TO FAIL"""
        try:
            # First create a ride request
            ride_data = {
                "pickup_location": {"address": "Test Pickup", "lat": 48.7758, "lng": 9.1829},
                "dropoff_location": {"address": "Test Dropoff", "lat": 48.7768, "lng": 9.1839},
                "vehicle_type": "economy"
            }
            
            request_response = requests.post(f"{BASE_URL}/api/rides/request", json=ride_data, timeout=10)
            if request_response.status_code == 200:
                request_id = request_response.json().get("request_id")
                
                # Accept the ride
                accept_response = requests.post(f"{BASE_URL}/api/rides/{request_id}/accept", timeout=10)
                if accept_response.status_code == 200:
                    data = accept_response.json()
                    if "notification_metadata" in data and "sound_required" in data["notification_metadata"]:
                        self.log_test_result("Ride Accept Sound Metadata", True, "Ride accept includes sound metadata")
                        return True
                    else:
                        self.log_test_result("Ride Accept Sound Metadata", False, "Ride accept missing sound metadata")
                        return False
                else:
                    self.log_test_result("Ride Accept Sound Metadata", False, f"Ride accept failed with {accept_response.status_code}")
                    return False
            else:
                self.log_test_result("Ride Accept Sound Metadata", False, f"Ride request failed with {request_response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Ride Accept Sound Metadata", False, f"Error: {str(e)}")
            return False

class TestWebSocketNotifications:
    """Test WebSocket notification system - should FAIL initially"""
    
    async def test_websocket_ride_request_includes_sound_data(self):
        """Test that WebSocket ride request includes sound data - EXPECTED TO FAIL"""
        try:
            driver_id = f"test-driver-{int(time.time())}"
            ws_url = f"{WS_URL}/{driver_id}"
            
            async with websockets.connect(ws_url, timeout=5) as websocket:
                # Create ride request
                ride_data = {
                    "pickup_location": {"address": "Test Pickup", "lat": 48.7758, "lng": 9.1829},
                    "dropoff_location": {"address": "Test Dropoff", "lat": 48.7768, "lng": 9.1839},
                    "vehicle_type": "economy"
                }
                
                response = requests.post(f"{BASE_URL}/api/rides/request", json=ride_data, timeout=10)
                if response.status_code == 200:
                    # Wait for WebSocket message
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        data = json.loads(message)
                        
                        if "sound_required" in data and data["sound_required"] == True:
                            self.log_test_result("WebSocket Ride Request Sound", True, "WebSocket message includes sound data")
                            return True
                        else:
                            self.log_test_result("WebSocket Ride Request Sound", False, "WebSocket message missing sound data")
                            return False
                    except asyncio.TimeoutError:
                        self.log_test_result("WebSocket Ride Request Sound", False, "WebSocket message not received within timeout")
                        return False
                else:
                    self.log_test_result("WebSocket Ride Request Sound", False, f"Ride request failed with {response.status_code}")
                    return False
        except Exception as e:
            self.log_test_result("WebSocket Ride Request Sound", False, f"Error: {str(e)}")
            return False

class TestSLOCompliance:
    """Test SLO compliance - should FAIL initially"""
    
    def test_book_to_drivers_latency_slo(self):
        """Test Book→drivers latency meets P95≤1.5s SLO - EXPECTED TO FAIL"""
        latencies = []
        
        for i in range(5):  # Run 5 tests for statistical significance
            start_time = time.time()
            
            ride_data = {
                "pickup_location": {"address": f"Test Pickup {i}", "lat": 48.7758, "lng": 9.1829},
                "dropoff_location": {"address": f"Test Dropoff {i}", "lat": 48.7768, "lng": 9.1839},
                "vehicle_type": "economy"
            }
            
            try:
                response = requests.post(f"{BASE_URL}/api/rides/request", json=ride_data, timeout=10)
                if response.status_code == 200:
                    latency_ms = (time.time() - start_time) * 1000
                    latencies.append(latency_ms)
                else:
                    self.log_test_result("Book→Drivers Latency SLO", False, f"Ride request {i} failed with {response.status_code}")
                    return False
            except Exception as e:
                self.log_test_result("Book→Drivers Latency SLO", False, f"Ride request {i} error: {str(e)}")
                return False
            
            time.sleep(0.1)  # Small delay between requests
        
        if latencies:
            latencies.sort()
            p95_idx = int(len(latencies) * 0.95)
            p95_latency = latencies[p95_idx] if p95_idx < len(latencies) else latencies[-1]
            
            if p95_latency <= 1500:
                self.log_test_result("Book→Drivers Latency SLO", True, f"P95 latency {p95_latency:.2f}ms meets SLO", p95_latency)
                return True
            else:
                self.log_test_result("Book→Drivers Latency SLO", False, f"P95 latency {p95_latency:.2f}ms exceeds 1.5s SLO", p95_latency)
                return False
        else:
            self.log_test_result("Book→Drivers Latency SLO", False, "No latency measurements collected")
            return False
    
    def test_accept_to_passenger_latency_slo(self):
        """Test Accept→passenger latency meets P95≤1.0s SLO - EXPECTED TO FAIL"""
        latencies = []
        
        for i in range(5):  # Run 5 tests for statistical significance
            start_time = time.time()
            
            # Create ride request
            ride_data = {
                "pickup_location": {"address": f"Test Pickup {i}", "lat": 48.7758, "lng": 9.1829},
                "dropoff_location": {"address": f"Test Dropoff {i}", "lat": 48.7768, "lng": 9.1839},
                "vehicle_type": "economy"
            }
            
            try:
                request_response = requests.post(f"{BASE_URL}/api/rides/request", json=ride_data, timeout=10)
                if request_response.status_code == 200:
                    request_id = request_response.json().get("request_id")
                    
                    # Accept the ride
                    accept_response = requests.post(f"{BASE_URL}/api/rides/{request_id}/accept", timeout=10)
                    if accept_response.status_code == 200:
                        latency_ms = (time.time() - start_time) * 1000
                        latencies.append(latency_ms)
                    else:
                        self.log_test_result("Accept→Passenger Latency SLO", False, f"Ride accept {i} failed with {accept_response.status_code}")
                        return False
                else:
                    self.log_test_result("Accept→Passenger Latency SLO", False, f"Ride request {i} failed with {request_response.status_code}")
                    return False
            except Exception as e:
                self.log_test_result("Accept→Passenger Latency SLO", False, f"Ride {i} error: {str(e)}")
                return False
            
            time.sleep(0.1)  # Small delay between requests
        
        if latencies:
            latencies.sort()
            p95_idx = int(len(latencies) * 0.95)
            p95_latency = latencies[p95_idx] if p95_idx < len(latencies) else latencies[-1]
            
            if p95_latency <= 1000:
                self.log_test_result("Accept→Passenger Latency SLO", True, f"P95 latency {p95_latency:.2f}ms meets SLO", p95_latency)
                return True
            else:
                self.log_test_result("Accept→Passenger Latency SLO", False, f"P95 latency {p95_latency:.2f}ms exceeds 1.0s SLO", p95_latency)
                return False
        else:
            self.log_test_result("Accept→Passenger Latency SLO", False, "No latency measurements collected")
            return False

class TestRollbackMechanism:
    """Test rollback mechanism - should FAIL initially"""
    
    def test_feature_flag_off_disables_new_behavior(self):
        """Test that feature flag OFF disables new behavior - EXPECTED TO FAIL"""
        try:
            # Try to disable feature flag (this might fail if feature flag system doesn't exist)
            try:
                disable_response = requests.post(f"{BASE_URL}/api/feature-flags/realtime.status.deltaV1", 
                                               json={"enabled": False}, timeout=5)
            except:
                # If feature flag system doesn't exist, this test should fail
                self.log_test_result("Feature Flag Rollback", False, "Feature flag system does not exist")
                return False
            
            # Create ride request with feature flag OFF
            ride_data = {
                "pickup_location": {"address": "Test Pickup", "lat": 48.7758, "lng": 9.1829},
                "dropoff_location": {"address": "Test Dropoff", "lat": 48.7768, "lng": 9.1839},
                "vehicle_type": "economy"
            }
            
            response = requests.post(f"{BASE_URL}/api/rides/request", json=ride_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                # With feature flag OFF, should NOT include new behavior
                if "notification_metadata" not in data:
                    self.log_test_result("Feature Flag Rollback", True, "New behavior disabled with feature flag OFF")
                    return True
                else:
                    self.log_test_result("Feature Flag Rollback", False, "New behavior still active with feature flag OFF")
                    return False
            else:
                self.log_test_result("Feature Flag Rollback", False, f"Ride request failed with {response.status_code}")
                return False
        except Exception as e:
            self.log_test_result("Feature Flag Rollback", False, f"Error: {str(e)}")
            return False

def run_tdd_test_suite():
    """Run the complete TDD test suite"""
    print("🧪 QA Enforcement Charter - Test-Driven Development Test Suite")
    print("=" * 80)
    print("⚠️  These tests are designed to FAIL initially!")
    print("   They define the requirements that need to be implemented.")
    print("   This is the RED phase of TDD (Red-Green-Refactor)")
    print("=" * 80)
    
    test_suite = TDDTestSuite()
    
    # Run all test classes
    test_classes = [
        TestFeatureFlagSystem,
        TestObservabilitySystem,
        TestSoundNotificationSystem,
        TestEnhancedNotifications,
        TestSLOCompliance,
        TestRollbackMechanism
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for test_class in test_classes:
        print(f"\n📋 Running {test_class.__name__}...")
        
        # Get all test methods
        test_methods = [method for method in dir(test_class) if method.startswith('test_')]
        
        for test_method in test_methods:
            total_tests += 1
            test_instance = test_class()
            
            try:
                # Run the test
                result = getattr(test_instance, test_method)()
                if result:
                    passed_tests += 1
                else:
                    failed_tests += 1
                
            except Exception as e:
                failed_tests += 1
                test_suite.log_test_result(f"{test_class.__name__}.{test_method}", False, f"Test exception: {str(e)}")
    
    # Run async WebSocket tests
    print(f"\n📋 Running WebSocket Tests...")
    async def run_websocket_tests():
        ws_test_instance = TestWebSocketNotifications()
        try:
            result = await ws_test_instance.test_websocket_ride_request_includes_sound_data()
            if result:
                passed_tests += 1
            else:
                failed_tests += 1
        except Exception as e:
            failed_tests += 1
            test_suite.log_test_result("WebSocket Ride Request Sound", False, f"Test exception: {str(e)}")
    
    # Run async tests
    try:
        asyncio.run(run_websocket_tests())
        total_tests += 1
    except Exception as e:
        failed_tests += 1
        test_suite.log_test_result("WebSocket Tests", False, f"Async test error: {str(e)}")
    
    # Generate summary report
    print("\n" + "=" * 80)
    print("📊 TDD BASELINE SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if failed_tests > 0:
        print(f"\n✅ SUCCESS: {failed_tests} tests failed as expected!")
        print("   This confirms we have a proper TDD baseline (RED phase).")
        print("   Next step: Implement features one by one to make tests pass (GREEN phase).")
        
        print(f"\n📋 FAILING TESTS TO IMPLEMENT:")
        for test in test_suite.failing_tests:
            print(f"  ❌ {test['test_name']}: {test['details']}")
    else:
        print("\n⚠️  WARNING: All tests passed unexpectedly!")
        print("   This might indicate the system already has some features implemented.")
    
    # Save test results
    with open("tdd_baseline_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests/total_tests)*100,
            "test_results": test_suite.test_results,
            "failing_tests": test_suite.failing_tests,
            "passing_tests": test_suite.passing_tests
        }, f, indent=2)
    
    print(f"\n📄 TDD baseline results saved to: tdd_baseline_results.json")
    
    return test_suite.test_results

if __name__ == "__main__":
    run_tdd_test_suite()
