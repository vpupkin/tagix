#!/usr/bin/env python3
"""
QA Enforcement Charter - Test-Driven Development Baseline Runner
This script runs all tests against the current system to establish baseline failures
and document what needs to be implemented following TDD methodology.

TDD Process:
1. RED: Write failing tests (this script)
2. GREEN: Implement minimal code to make tests pass
3. REFACTOR: Improve code while keeping tests green
4. Repeat for each requirement
"""

import subprocess
import json
import time
import sys
import os
from datetime import datetime

def run_command(command, description):
    """Run a command and return the result"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Command timed out after 60 seconds",
            "returncode": -1
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "returncode": -1
        }

def check_system_health():
    """Check if the system is running and healthy"""
    print("🏥 Checking system health...")
    
    health_checks = [
        ("curl -s http://localhost:8001/api/health", "Backend API Health"),
        ("curl -s http://localhost:3000", "Frontend Health"),
        ("docker ps | grep tagix", "Docker Containers"),
    ]
    
    results = {}
    for command, description in health_checks:
        result = run_command(command, description)
        results[description] = result
        if result["success"]:
            print(f"  ✅ {description}: OK")
        else:
            print(f"  ❌ {description}: FAILED")
            if result["stderr"]:
                print(f"     Error: {result['stderr']}")
    
    return results

def run_backend_tdd_tests():
    """Run backend TDD tests"""
    print("\n🧪 Running Backend TDD Tests...")
    
    # Install test dependencies if needed
    install_result = run_command(
        "pip3 install pytest requests websockets",
        "Installing test dependencies"
    )
    
    if not install_result["success"]:
        print(f"  ⚠️  Warning: Could not install dependencies: {install_result['stderr']}")
    
    # Run the backend TDD tests
    test_result = run_command(
        "python3 test_qa_enforcement_charter_tdd.py",
        "Running backend TDD tests"
    )
    
    return test_result

def run_frontend_tdd_tests():
    """Run frontend TDD tests"""
    print("\n🧪 Running Frontend TDD Tests...")
    
    # Install Node.js dependencies if needed
    install_result = run_command(
        "npm install ws axios",
        "Installing frontend test dependencies"
    )
    
    if not install_result["success"]:
        print(f"  ⚠️  Warning: Could not install dependencies: {install_result['stderr']}")
    
    # Run the frontend TDD tests
    test_result = run_command(
        "node test_frontend_qa_tdd.js",
        "Running frontend TDD tests"
    )
    
    return test_result

def analyze_current_system():
    """Analyze the current system to understand what exists"""
    print("\n🔍 Analyzing Current System...")
    
    analysis = {
        "timestamp": datetime.now().isoformat(),
        "system_health": {},
        "existing_endpoints": {},
        "existing_features": {},
        "missing_features": []
    }
    
    # Check system health
    analysis["system_health"] = check_system_health()
    
    # Check existing API endpoints
    endpoint_checks = [
        ("curl -s http://localhost:8001/api/health", "Health Endpoint"),
        ("curl -s http://localhost:8001/api/feature-flags", "Feature Flags Endpoint"),
        ("curl -s http://localhost:8001/api/observability/ride_status_fanout.count", "Fanout Counter"),
        ("curl -s http://localhost:8001/api/observability/ride_status_push_sent.count", "Push Counter"),
        ("curl -s http://localhost:8001/api/observability/ride_status_e2e_latency_ms", "Latency Timer"),
        ("curl -s http://localhost:8001/api/sound-profiles", "Sound Profiles Endpoint"),
    ]
    
    for command, description in endpoint_checks:
        result = run_command(command, f"Checking {description}")
        analysis["existing_endpoints"][description] = {
            "exists": result["success"],
            "response": result["stdout"] if result["success"] else result["stderr"]
        }
    
    # Check existing features
    feature_checks = [
        ("grep -r 'realtime.status.deltaV1' backend/", "Feature Flag in Backend"),
        ("grep -r 'sound_required' backend/", "Sound Requirements in Backend"),
        ("grep -r 'sound_required' frontend/", "Sound Requirements in Frontend"),
        ("grep -r 'ride_status_fanout' backend/", "Fanout Counter in Backend"),
        ("grep -r 'ride_status_push_sent' backend/", "Push Counter in Backend"),
    ]
    
    for command, description in feature_checks:
        result = run_command(command, f"Checking {description}")
        analysis["existing_features"][description] = {
            "exists": result["success"] and result["stdout"].strip() != "",
            "matches": result["stdout"].strip() if result["success"] else ""
        }
    
    return analysis

def generate_implementation_plan(analysis):
    """Generate implementation plan based on analysis"""
    print("\n📋 Generating TDD Implementation Plan...")
    
    plan = {
        "timestamp": datetime.now().isoformat(),
        "tdd_phases": [],
        "implementation_steps": {},
        "estimated_effort": {}
    }
    
    # TDD Phase 1: Feature Flag System
    if not analysis["existing_endpoints"]["Feature Flags Endpoint"]["exists"]:
        plan["tdd_phases"].append("phase_1_feature_flag_system")
        plan["implementation_steps"]["phase_1_feature_flag_system"] = {
            "description": "Implement feature flag system with realtime.status.deltaV1",
            "tdd_approach": "RED: Tests fail → GREEN: Implement feature flag → REFACTOR: Optimize",
            "files_to_modify": ["backend/server.py"],
            "new_endpoints": ["/api/feature-flags", "/api/feature-flags/{flag_name}"],
            "estimated_effort": "2-3 hours",
            "tests_to_pass": [
                "Feature Flag Endpoint Exists",
                "Feature Flag realtime.status.deltaV1 Exists", 
                "Feature Flag Defaults to OFF"
            ]
        }
    
    # TDD Phase 2: Observability System
    observability_missing = []
    if not analysis["existing_endpoints"]["Fanout Counter"]["exists"]:
        observability_missing.append("ride_status_fanout.count")
    if not analysis["existing_endpoints"]["Push Counter"]["exists"]:
        observability_missing.append("ride_status_push_sent.count")
    if not analysis["existing_endpoints"]["Latency Timer"]["exists"]:
        observability_missing.append("ride_status_e2e_latency_ms")
    
    if observability_missing:
        plan["tdd_phases"].append("phase_2_observability_system")
        plan["implementation_steps"]["phase_2_observability_system"] = {
            "description": f"Implement observability system: {', '.join(observability_missing)}",
            "tdd_approach": "RED: Tests fail → GREEN: Implement counters/timers → REFACTOR: Optimize",
            "files_to_modify": ["backend/server.py"],
            "new_endpoints": ["/api/observability/{counter_name}"],
            "estimated_effort": "3-4 hours",
            "tests_to_pass": [
                "Fanout Counter Exists",
                "Push Counter Exists", 
                "Latency Timer Exists"
            ]
        }
    
    # TDD Phase 3: Sound System
    if not analysis["existing_endpoints"]["Sound Profiles Endpoint"]["exists"]:
        plan["tdd_phases"].append("phase_3_sound_system")
        plan["implementation_steps"]["phase_3_sound_system"] = {
            "description": "Implement sound notification system",
            "tdd_approach": "RED: Tests fail → GREEN: Implement sound profiles → REFACTOR: Optimize",
            "files_to_modify": ["backend/server.py", "frontend/src/contexts/WebSocketContext.js"],
            "new_endpoints": ["/api/sound-profiles"],
            "estimated_effort": "4-5 hours",
            "tests_to_pass": [
                "Sound Profiles Endpoint Exists",
                "Required Sound Profiles Exist",
                "Sound Data in Notifications"
            ]
        }
    
    # TDD Phase 4: Enhanced Notifications
    if not analysis["existing_features"]["Sound Requirements in Backend"]["exists"]:
        plan["tdd_phases"].append("phase_4_enhanced_notifications")
        plan["implementation_steps"]["phase_4_enhanced_notifications"] = {
            "description": "Enhance ride lifecycle notifications with sound and immediate UI refresh",
            "tdd_approach": "RED: Tests fail → GREEN: Implement enhanced notifications → REFACTOR: Optimize",
            "files_to_modify": ["backend/server.py", "frontend/src/contexts/WebSocketContext.js"],
            "functions_to_modify": [
                "create_ride_request()",
                "accept_ride_request()",
                "update_ride_status()",
                "handleWebSocketMessage()"
            ],
            "estimated_effort": "6-8 hours",
            "tests_to_pass": [
                "Ride Request Includes Sound Metadata",
                "Ride Accept Includes Sound Metadata",
                "WebSocket Ride Request Includes Sound Data",
                "WebSocket Ride Accept Includes Sound Data"
            ]
        }
    
    # TDD Phase 5: SLO Compliance
    plan["tdd_phases"].append("phase_5_slo_compliance")
    plan["implementation_steps"]["phase_5_slo_compliance"] = {
        "description": "Implement latency measurement and SLO compliance",
        "tdd_approach": "RED: Tests fail → GREEN: Implement latency measurement → REFACTOR: Optimize",
        "files_to_modify": ["backend/server.py"],
        "estimated_effort": "3-4 hours",
        "tests_to_pass": [
            "Book→Drivers Latency SLO (P95≤1.5s)",
            "Accept→Passenger Latency SLO (P95≤1.0s)"
        ]
    }
    
    # TDD Phase 6: Rollback Mechanism
    plan["tdd_phases"].append("phase_6_rollback_mechanism")
    plan["implementation_steps"]["phase_6_rollback_mechanism"] = {
        "description": "Implement rollback mechanism with feature flag OFF",
        "tdd_approach": "RED: Tests fail → GREEN: Implement rollback → REFACTOR: Optimize",
        "files_to_modify": ["backend/server.py", "frontend/src/contexts/WebSocketContext.js"],
        "estimated_effort": "2-3 hours",
        "tests_to_pass": [
            "Feature Flag Rollback Disables New Behavior"
        ]
    }
    
    return plan

def main():
    """Main TDD baseline runner function"""
    print("🚀 QA Enforcement Charter - Test-Driven Development Baseline Runner")
    print("=" * 80)
    print("This script will:")
    print("1. Check system health")
    print("2. Analyze current system capabilities")
    print("3. Run comprehensive TDD test suite")
    print("4. Generate TDD implementation plan")
    print("5. Document baseline failures for TDD approach")
    print("=" * 80)
    
    # Step 1: Analyze current system
    analysis = analyze_current_system()
    
    # Step 2: Run backend TDD tests
    backend_test_result = run_backend_tdd_tests()
    
    # Step 3: Run frontend TDD tests
    frontend_test_result = run_frontend_tdd_tests()
    
    # Step 4: Generate TDD implementation plan
    implementation_plan = generate_implementation_plan(analysis)
    
    # Step 5: Generate comprehensive TDD report
    report = {
        "timestamp": datetime.now().isoformat(),
        "tdd_approach": "Test-Driven Development (Red-Green-Refactor)",
        "analysis": analysis,
        "test_results": {
            "backend": {
                "success": backend_test_result["success"],
                "stdout": backend_test_result["stdout"],
                "stderr": backend_test_result["stderr"]
            },
            "frontend": {
                "success": frontend_test_result["success"],
                "stdout": frontend_test_result["stdout"],
                "stderr": frontend_test_result["stderr"]
            }
        },
        "implementation_plan": implementation_plan
    }
    
    # Save comprehensive TDD report
    with open("tdd_baseline_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    # Print TDD summary
    print("\n" + "=" * 80)
    print("📊 TDD BASELINE SUMMARY")
    print("=" * 80)
    
    print(f"System Health: {'✅ Healthy' if all(analysis['system_health'][k]['success'] for k in analysis['system_health']) else '❌ Issues Found'}")
    print(f"Backend TDD Tests: {'✅ Passed' if backend_test_result['success'] else '❌ Failed (Expected)'}")
    print(f"Frontend TDD Tests: {'✅ Passed' if frontend_test_result['success'] else '❌ Failed (Expected)'}")
    
    print(f"\n📋 TDD Implementation Plan ({len(implementation_plan['tdd_phases'])} phases):")
    for i, phase in enumerate(implementation_plan['tdd_phases'], 1):
        step = implementation_plan['implementation_steps'][phase]
        print(f"  Phase {i}: {step['description']}")
        print(f"     TDD Approach: {step['tdd_approach']}")
        print(f"     Effort: {step['estimated_effort']}")
        print(f"     Tests to Pass: {len(step['tests_to_pass'])} tests")
        print(f"     Files: {', '.join(step['files_to_modify'])}")
        print()
    
    print(f"📄 Full TDD report saved to: tdd_baseline_report.json")
    
    if not backend_test_result["success"] and not frontend_test_result["success"]:
        print("\n✅ SUCCESS: All TDD tests failed as expected!")
        print("   This confirms we have a proper TDD baseline (RED phase).")
        print("   Next step: Implement features one by one to make tests pass (GREEN phase).")
        print("\n🎯 TDD Workflow:")
        print("   1. RED: Tests fail (current state)")
        print("   2. GREEN: Implement minimal code to make tests pass")
        print("   3. REFACTOR: Improve code while keeping tests green")
        print("   4. Repeat for each phase")
        return 0
    else:
        print("\n⚠️  WARNING: Some TDD tests passed unexpectedly.")
        print("   This might indicate the system already has some features implemented.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
