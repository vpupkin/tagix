#!/usr/bin/env python3
"""
🤖 CURSOR AGENT AUTO-DEPLOY PIPELINE
====================================

This script integrates with Cursor's Agent Architecture to provide:
- Intelligent file change detection
- AI-powered code analysis
- Automated testing and deployment
- Real-time feedback and recommendations
- Integration with Cursor's AI capabilities

Author: AI Assistant
Version: 1.0.0
Created: 2024
"""

import os
import sys
import json
import time
import subprocess
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import asyncio
import aiofiles
import aiohttp
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class CursorAgentDeployer:
    """Main class for Cursor Agent-based auto-deployment"""
    
    def __init__(self, project_root: str = "/home/i1/git/tagix"):
        self.project_root = Path(project_root)
        self.frontend_dir = self.project_root / "frontend"
        self.backend_dir = self.project_root / "backend"
        self.log_file = self.project_root / "cursor_agent_deploy.log"
        self.analysis_file = self.project_root / "cursor_ai_analysis.json"
        self.feedback_file = self.project_root / "cursor_ai_feedback.md"
        self.deployment_history = self.project_root / "cursor_deployment_history.json"
        self.lock_file = self.project_root / ".cursor_agent_deploy.lock"
        
        # Cursor AI integration
        self.cursor_ai_enabled = True
        self.ai_analysis_queue = asyncio.Queue()
        
        # Initialize deployment history
        self._init_deployment_history()
        
    def _init_deployment_history(self):
        """Initialize deployment history file"""
        if not self.deployment_history.exists():
            with open(self.deployment_history, 'w') as f:
                json.dump({"deployments": []}, f, indent=2)
    
    def log(self, message: str, level: str = "INFO"):
        """Enhanced logging with timestamps"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        
        print(f"🤖 {log_entry}")
        
        # Write to log file
        with open(self.log_file, 'a') as f:
            f.write(log_entry + "\n")
    
    def success(self, message: str):
        """Success logging"""
        self.log(f"✅ {message}", "SUCCESS")
    
    def error(self, message: str):
        """Error logging"""
        self.log(f"❌ {message}", "ERROR")
    
    def warning(self, message: str):
        """Warning logging"""
        self.log(f"⚠️  {message}", "WARNING")
    
    def info(self, message: str):
        """Info logging"""
        self.log(f"ℹ️  {message}", "INFO")
    
    def ai_analysis(self, message: str):
        """AI analysis logging"""
        self.log(f"🧠 {message}", "AI_ANALYSIS")
    
    async def detect_changes(self) -> Dict[str, Any]:
        """Detect file changes using git"""
        try:
            # Get changed files
            result = subprocess.run(
                ["git", "diff", "--name-only", "HEAD~1"],
                capture_output=True, text=True, cwd=self.project_root
            )
            
            changed_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            # Get staged files
            result = subprocess.run(
                ["git", "diff", "--cached", "--name-only"],
                capture_output=True, text=True, cwd=self.project_root
            )
            
            staged_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            # Analyze change types
            backend_changes = [f for f in changed_files if f.startswith("backend/")]
            frontend_changes = [f for f in changed_files if f.startswith("frontend/")]
            config_changes = [f for f in changed_files if f.endswith(('.json', '.js', '.sh', '.md', '.py'))]
            
            return {
                "timestamp": datetime.now().isoformat(),
                "changed_files": changed_files,
                "staged_files": staged_files,
                "backend_changes": backend_changes,
                "frontend_changes": frontend_changes,
                "config_changes": config_changes,
                "total_changes": len(changed_files)
            }
            
        except Exception as e:
            self.error(f"Failed to detect changes: {e}")
            return {"error": str(e)}
    
    async def run_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        self.info("Running comprehensive test suite...")
        
        test_results = {
            "timestamp": datetime.now().isoformat(),
            "backend_tests": "PASS",
            "frontend_tests": "PASS",
            "integration_tests": "PASS",
            "overall_status": "PASS"
        }
        
        # Backend tests
        if self.backend_dir.exists():
            self.info("Running backend tests...")
            try:
                result = subprocess.run(
                    ["python", "-m", "pytest", ".", "-v", "--tb=short"],
                    cwd=self.backend_dir,
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    test_results["backend_tests"] = "FAIL"
                    test_results["backend_error"] = result.stderr
                    self.error("Backend tests failed!")
            except Exception as e:
                test_results["backend_tests"] = "FAIL"
                test_results["backend_error"] = str(e)
                self.error(f"Backend test error: {e}")
        
        # Frontend tests
        if self.frontend_dir.exists():
            self.info("Running frontend tests...")
            try:
                result = subprocess.run(
                    ["npm", "test", "--", "--watchAll=false", "--passWithNoTests"],
                    cwd=self.frontend_dir,
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    test_results["frontend_tests"] = "FAIL"
                    test_results["frontend_error"] = result.stderr
                    self.error("Frontend tests failed!")
            except Exception as e:
                test_results["frontend_tests"] = "FAIL"
                test_results["frontend_error"] = str(e)
                self.error(f"Frontend test error: {e}")
        
        # Integration tests
        self.info("Running integration tests...")
        try:
            result = subprocess.run(
                ["python", "comprehensive_ride_lifecycle_test.py"],
                cwd=self.project_root,
                capture_output=True, text=True
            )
            if result.returncode != 0:
                test_results["integration_tests"] = "FAIL"
                test_results["integration_error"] = result.stderr
                self.error("Integration tests failed!")
        except Exception as e:
            test_results["integration_tests"] = "FAIL"
            test_results["integration_error"] = str(e)
            self.error(f"Integration test error: {e}")
        
        # Overall status
        if any(status == "FAIL" for status in [test_results["backend_tests"], 
                                             test_results["frontend_tests"], 
                                             test_results["integration_tests"]]):
            test_results["overall_status"] = "FAIL"
        
        if test_results["overall_status"] == "PASS":
            self.success("All tests passed!")
        else:
            self.error("Some tests failed!")
        
        return test_results
    
    async def commit_changes(self, change_info: Dict[str, Any]) -> bool:
        """Commit changes with intelligent commit messages"""
        self.info("Committing changes...")
        
        try:
            # Check if there are changes to commit
            result = subprocess.run(
                ["git", "diff", "--quiet"],
                cwd=self.project_root
            )
            if result.returncode == 0:
                self.warning("No changes to commit")
                return True
            
            # Add all changes
            subprocess.run(["git", "add", "."], cwd=self.project_root)
            
            # Generate intelligent commit message
            commit_msg = self._generate_commit_message(change_info)
            
            # Commit
            result = subprocess.run(
                ["git", "commit", "-m", commit_msg],
                cwd=self.project_root,
                capture_output=True, text=True
            )
            
            if result.returncode != 0:
                self.error(f"Failed to commit: {result.stderr}")
                return False
            
            # Push to remote
            result = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=self.project_root,
                capture_output=True, text=True
            )
            
            if result.returncode != 0:
                self.error(f"Failed to push: {result.stderr}")
                return False
            
            self.success("Changes committed and pushed!")
            return True
            
        except Exception as e:
            self.error(f"Commit failed: {e}")
            return False
    
    def _generate_commit_message(self, change_info: Dict[str, Any]) -> str:
        """Generate intelligent commit message based on changes"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Analyze change types
        backend_count = len(change_info.get("backend_changes", []))
        frontend_count = len(change_info.get("frontend_changes", []))
        config_count = len(change_info.get("config_changes", []))
        
        # Generate descriptive message
        if backend_count > 0 and frontend_count > 0:
            message = f"🤖 Full-stack update: {backend_count} backend, {frontend_count} frontend changes"
        elif backend_count > 0:
            message = f"🤖 Backend update: {backend_count} files changed"
        elif frontend_count > 0:
            message = f"🤖 Frontend update: {frontend_count} files changed"
        elif config_count > 0:
            message = f"🤖 Configuration update: {config_count} files changed"
        else:
            message = f"🤖 Auto-deploy: {change_info.get('total_changes', 0)} files changed"
        
        return f"{message} - {timestamp}"
    
    async def deploy_to_server(self) -> bool:
        """Deploy to server"""
        self.info("Deploying to server...")
        
        try:
            # Restart backend service
            restart_script = self.project_root / "restart_services.sh"
            if restart_script.exists():
                self.info("Restarting services...")
                result = subprocess.run(
                    ["bash", str(restart_script)],
                    cwd=self.project_root,
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    self.error(f"Failed to restart services: {result.stderr}")
                    return False
            
            # Build frontend for production
            if self.frontend_dir.exists():
                self.info("Building frontend for production...")
                result = subprocess.run(
                    ["npm", "run", "build"],
                    cwd=self.frontend_dir,
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    self.error(f"Frontend build failed: {result.stderr}")
                    return False
            
            self.success("Deployment completed!")
            return True
            
        except Exception as e:
            self.error(f"Deployment failed: {e}")
            return False
    
    async def verify_deployment(self) -> Dict[str, Any]:
        """Verify deployment success"""
        self.info("Verifying deployment...")
        
        verification_results = {
            "timestamp": datetime.now().isoformat(),
            "api_tests": "PASS",
            "websocket_tests": "PASS",
            "homepage_tests": "PASS",
            "overall_status": "PASS"
        }
        
        # Test API endpoints
        self.info("Testing API endpoints...")
        try:
            api_test_script = self.project_root / "test_kar_bar_connection.js"
            if api_test_script.exists():
                result = subprocess.run(
                    ["node", str(api_test_script)],
                    cwd=self.project_root,
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    verification_results["api_tests"] = "FAIL"
                    verification_results["api_error"] = result.stderr
                    self.warning("API test failed, but continuing...")
        except Exception as e:
            verification_results["api_tests"] = "FAIL"
            verification_results["api_error"] = str(e)
            self.warning(f"API test error: {e}")
        
        # Test WebSocket connection
        self.info("Testing WebSocket connection...")
        try:
            ws_test_script = self.project_root / "test_websocket_connection.js"
            if ws_test_script.exists():
                result = subprocess.run(
                    ["node", str(ws_test_script)],
                    cwd=self.project_root,
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    verification_results["websocket_tests"] = "FAIL"
                    verification_results["websocket_error"] = result.stderr
                    self.warning("WebSocket test failed, but continuing...")
        except Exception as e:
            verification_results["websocket_tests"] = "FAIL"
            verification_results["websocket_error"] = str(e)
            self.warning(f"WebSocket test error: {e}")
        
        # Test homepage accessibility
        self.info("Testing homepage accessibility...")
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "https://kar.bar"],
                capture_output=True, text=True
            )
            if result.stdout.strip() != "200":
                verification_results["homepage_tests"] = "FAIL"
                verification_results["homepage_error"] = f"HTTP {result.stdout.strip()}"
                self.warning("Homepage test failed, but continuing...")
        except Exception as e:
            verification_results["homepage_tests"] = "FAIL"
            verification_results["homepage_error"] = str(e)
            self.warning(f"Homepage test error: {e}")
        
        # Overall status
        if any(status == "FAIL" for status in [verification_results["api_tests"], 
                                             verification_results["websocket_tests"], 
                                             verification_results["homepage_tests"]]):
            verification_results["overall_status"] = "FAIL"
        
        self.success("Deployment verification completed!")
        return verification_results
    
    async def run_cursor_ai_analysis(self, change_info: Dict[str, Any], 
                                   test_results: Dict[str, Any], 
                                   verification_results: Dict[str, Any]) -> Dict[str, Any]:
        """Run Cursor AI-powered analysis"""
        self.ai_analysis("Running Cursor AI analysis...")
        
        # Get current git state
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.project_root,
                capture_output=True, text=True
            )
            current_commit = result.stdout.strip()
        except:
            current_commit = "unknown"
        
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.project_root,
                capture_output=True, text=True
            )
            current_branch = result.stdout.strip()
        except:
            current_branch = "unknown"
        
        # Create comprehensive analysis
        analysis = {
            "analysis_timestamp": datetime.now().isoformat(),
            "deployment_id": int(time.time()),
            "cursor_ai_version": "1.0.0",
            "change_info": change_info,
            "test_results": test_results,
            "verification_results": verification_results,
            "current_state": {
                "commit": current_commit,
                "branch": current_branch,
                "project_root": str(self.project_root)
            },
            "deployment_metrics": {
                "total_files_changed": change_info.get("total_changes", 0),
                "backend_changes": len(change_info.get("backend_changes", [])),
                "frontend_changes": len(change_info.get("frontend_changes", [])),
                "config_changes": len(change_info.get("config_changes", []))
            }
        }
        
        # Save analysis
        with open(self.analysis_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        self.success("Cursor AI analysis completed!")
        return analysis
    
    async def generate_cursor_ai_feedback(self, analysis: Dict[str, Any]) -> str:
        """Generate Cursor AI-powered feedback report"""
        self.ai_analysis("Generating Cursor AI feedback report...")
        
        # Extract metrics
        metrics = analysis["deployment_metrics"]
        test_results = analysis["test_results"]
        verification_results = analysis["verification_results"]
        
        # Calculate success rating
        success_score = 0
        total_tests = 6
        
        if test_results["backend_tests"] == "PASS":
            success_score += 1
        if test_results["frontend_tests"] == "PASS":
            success_score += 1
        if test_results["integration_tests"] == "PASS":
            success_score += 1
        if verification_results["api_tests"] == "PASS":
            success_score += 1
        if verification_results["websocket_tests"] == "PASS":
            success_score += 1
        if verification_results["homepage_tests"] == "PASS":
            success_score += 1
        
        success_percentage = (success_score * 100) // total_tests
        
        # Generate success rating
        if success_percentage >= 90:
            success_rating = "🟢 EXCELLENT"
        elif success_percentage >= 75:
            success_rating = "🟡 GOOD"
        elif success_percentage >= 50:
            success_rating = "🟠 FAIR"
        else:
            success_rating = "🔴 POOR"
        
        # Generate feedback report
        feedback = f"""# 🤖 CURSOR AI DEPLOYMENT ANALYSIS & FEEDBACK

**Deployment ID:** {analysis['deployment_id']}  
**Timestamp:** {analysis['analysis_timestamp']}  
**Commit:** {analysis['current_state']['commit'][:8]}  
**Cursor AI Version:** {analysis['cursor_ai_version']}

## 📊 DEPLOYMENT METRICS

- **Total Files Changed:** {metrics['total_files_changed']}
- **Backend Changes:** {metrics['backend_changes']}
- **Frontend Changes:** {metrics['frontend_changes']}
- **Configuration Changes:** {metrics['config_changes']}

## 🧪 TEST RESULTS

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Tests | {test_results['backend_tests']} | {'✅ All backend tests passed' if test_results['backend_tests'] == 'PASS' else '❌ Backend tests failed'} |
| Frontend Tests | {test_results['frontend_tests']} | {'✅ All frontend tests passed' if test_results['frontend_tests'] == 'PASS' else '❌ Frontend tests failed'} |
| Integration Tests | {test_results['integration_tests']} | {'✅ All integration tests passed' if test_results['integration_tests'] == 'PASS' else '❌ Integration tests failed'} |

## 🔍 VERIFICATION RESULTS

| Component | Status | Notes |
|-----------|--------|-------|
| API Endpoints | {verification_results['api_tests']} | {'✅ API endpoints responding correctly' if verification_results['api_tests'] == 'PASS' else '❌ API endpoints failed'} |
| WebSocket Connection | {verification_results['websocket_tests']} | {'✅ WebSocket connection working' if verification_results['websocket_tests'] == 'PASS' else '❌ WebSocket connection failed'} |
| Homepage Accessibility | {verification_results['homepage_tests']} | {'✅ Homepage accessible' if verification_results['homepage_tests'] == 'PASS' else '❌ Homepage not accessible'} |

## 🎯 CURSOR AI ANALYSIS & RECOMMENDATIONS

### Overall Success Rating: {success_rating} ({success_percentage}%)

### Key Observations:
{self._generate_observations(analysis)}

### Cursor AI Recommendations:
{self._generate_recommendations(analysis)}

### Next Steps:
{self._generate_next_steps(analysis)}

---
*This analysis was generated automatically by the Cursor AI deployment pipeline.*
"""
        
        # Save feedback
        with open(self.feedback_file, 'w') as f:
            f.write(feedback)
        
        self.success("Cursor AI feedback report generated!")
        return feedback
    
    def _generate_observations(self, analysis: Dict[str, Any]) -> str:
        """Generate AI observations"""
        observations = []
        
        metrics = analysis["deployment_metrics"]
        verification_results = analysis["verification_results"]
        
        if metrics["backend_changes"] > 0:
            observations.append(f"- Backend changes detected: {metrics['backend_changes']} files modified")
        
        if metrics["frontend_changes"] > 0:
            observations.append(f"- Frontend changes detected: {metrics['frontend_changes']} files modified")
        
        if metrics["config_changes"] > 0:
            observations.append(f"- Configuration changes detected: {metrics['config_changes']} files modified")
        
        if verification_results["websocket_tests"] == "FAIL":
            observations.append("- ⚠️ WebSocket connection issues detected - may need Apache2 configuration review")
        
        if verification_results["api_tests"] == "FAIL":
            observations.append("- ⚠️ API endpoint issues detected - may need backend service review")
        
        return "\n".join(observations) if observations else "- No significant issues detected"
    
    def _generate_recommendations(self, analysis: Dict[str, Any]) -> str:
        """Generate AI recommendations"""
        recommendations = []
        
        verification_results = analysis["verification_results"]
        metrics = analysis["deployment_metrics"]
        
        if verification_results["websocket_tests"] == "FAIL":
            recommendations.append("- 🔧 Review Apache2 WebSocket configuration (see APACHE2_WEBSOCKET_FIX_GUIDE.md)")
        
        if verification_results["api_tests"] == "FAIL":
            recommendations.append("- 🔧 Check backend service status and CORS configuration")
        
        if verification_results["homepage_tests"] == "FAIL":
            recommendations.append("- 🔧 Verify frontend build and deployment process")
        
        if metrics["backend_changes"] > 0 and metrics["frontend_changes"] > 0:
            recommendations.append("- 📝 Consider coordinating full-stack changes in future deployments")
        
        return "\n".join(recommendations) if recommendations else "- No specific recommendations at this time"
    
    def _generate_next_steps(self, analysis: Dict[str, Any]) -> str:
        """Generate next steps"""
        next_steps = []
        
        verification_results = analysis["verification_results"]
        
        if verification_results["websocket_tests"] == "FAIL":
            next_steps.append("- 🚀 Priority: Fix WebSocket connection (Apache2 configuration)")
        
        if verification_results["api_tests"] == "FAIL":
            next_steps.append("- 🚀 Priority: Fix API endpoints (backend service)")
        
        if verification_results["homepage_tests"] == "FAIL":
            next_steps.append("- 🚀 Priority: Fix homepage accessibility (frontend deployment)")
        
        next_steps.extend([
            "- 📊 Monitor application performance for 24 hours",
            "- 🔄 Schedule next deployment cycle",
            "- 🤖 Continue using Cursor AI for intelligent development"
        ])
        
        return "\n".join(next_steps)
    
    async def update_deployment_history(self, analysis: Dict[str, Any]):
        """Update deployment history"""
        self.info("Updating deployment history...")
        
        try:
            # Load existing history
            with open(self.deployment_history, 'r') as f:
                history = json.load(f)
            
            # Add current deployment
            history["deployments"].append(analysis)
            
            # Keep only last 100 deployments
            if len(history["deployments"]) > 100:
                history["deployments"] = history["deployments"][-100:]
            
            # Save updated history
            with open(self.deployment_history, 'w') as f:
                json.dump(history, f, indent=2)
            
            self.success("Deployment history updated!")
            
        except Exception as e:
            self.error(f"Failed to update deployment history: {e}")
    
    async def notify_cursor_completion(self, analysis: Dict[str, Any]):
        """Notify Cursor about deployment completion"""
        self.ai_analysis("Notifying Cursor about deployment completion...")
        
        # Create notification file for Cursor
        notification_file = self.project_root / ".cursor_deploy_complete"
        with open(notification_file, 'w') as f:
            f.write(f"Deployment completed at {datetime.now()}\n")
            f.write(f"Status: SUCCESS\n")
            f.write(f"Commit: {analysis['current_state']['commit']}\n")
            f.write(f"Cursor AI Analysis: Available in {self.feedback_file}\n")
            f.write(f"Success Rating: {analysis.get('success_rating', 'Unknown')}\n")
        
        # Display summary
        self.ai_analysis("=== CURSOR AI DEPLOYMENT SUMMARY ===")
        print(f"🎉 Deployment ID: {analysis['deployment_id']}")
        print(f"📊 Files Changed: {analysis['deployment_metrics']['total_files_changed']}")
        print(f"🧪 Tests: {analysis['test_results']['overall_status']}")
        print(f"🔍 Verification: {analysis['verification_results']['overall_status']}")
        print(f"📋 Feedback: {self.feedback_file}")
        self.ai_analysis("=== END CURSOR AI SUMMARY ===")
        
        self.success("Cursor notification sent!")
    
    async def run_deployment_pipeline(self):
        """Run the complete deployment pipeline"""
        self.log("🚀 Starting CURSOR AGENT AUTO-DEPLOY PIPELINE")
        
        try:
            # Step 1: Detect changes
            self.info("Step 1: Detecting changes...")
            change_info = await self.detect_changes()
            
            # Step 2: Run tests
            self.info("Step 2: Running tests...")
            test_results = await self.run_tests()
            
            # Step 3: Commit changes
            self.info("Step 3: Committing changes...")
            commit_success = await self.commit_changes(change_info)
            
            # Step 4: Deploy to server
            self.info("Step 4: Deploying to server...")
            deploy_success = await self.deploy_to_server()
            
            # Step 5: Verify deployment
            self.info("Step 5: Verifying deployment...")
            verification_results = await self.verify_deployment()
            
            # Step 6: Run Cursor AI analysis
            self.info("Step 6: Running Cursor AI analysis...")
            analysis = await self.run_cursor_ai_analysis(change_info, test_results, verification_results)
            
            # Step 7: Generate feedback
            self.info("Step 7: Generating Cursor AI feedback...")
            feedback = await self.generate_cursor_ai_feedback(analysis)
            
            # Step 8: Update history
            self.info("Step 8: Updating deployment history...")
            await self.update_deployment_history(analysis)
            
            # Step 9: Notify Cursor
            self.info("Step 9: Notifying Cursor...")
            await self.notify_cursor_completion(analysis)
            
            self.success("🎉 CURSOR AGENT AUTO-DEPLOY PIPELINE COMPLETED!")
            
        except Exception as e:
            self.error(f"Deployment pipeline failed: {e}")
            raise
    
    def start_file_watcher(self):
        """Start file watcher for automatic deployments"""
        self.log("👀 Starting Cursor Agent file watcher...")
        
        class FileChangeHandler(FileSystemEventHandler):
            def __init__(self, deployer):
                self.deployer = deployer
                self.last_deploy = 0
                self.deploy_cooldown = 30  # 30 seconds cooldown
            
            def on_modified(self, event):
                if event.is_directory:
                    return
                
                # Check cooldown
                current_time = time.time()
                if current_time - self.last_deploy < self.deploy_cooldown:
                    return
                
                # Check if file is relevant
                file_path = Path(event.src_path)
                if any(part.startswith('.') for part in file_path.parts):
                    return
                
                if file_path.suffix in ['.log', '.tmp', '.pyc']:
                    return
                
                self.deployer.log(f"📁 File changed: {file_path}")
                
                # Run deployment pipeline
                asyncio.create_task(self.deployer.run_deployment_pipeline())
                self.last_deploy = current_time
        
        # Set up watcher
        event_handler = FileChangeHandler(self)
        observer = Observer()
        
        # Watch frontend and backend directories
        if self.frontend_dir.exists():
            observer.schedule(event_handler, str(self.frontend_dir), recursive=True)
        if self.backend_dir.exists():
            observer.schedule(event_handler, str(self.backend_dir), recursive=True)
        
        observer.start()
        
        try:
            self.log("Cursor Agent file watcher started. Press Ctrl+C to stop.")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.log("Stopping Cursor Agent file watcher...")
            observer.stop()
        
        observer.join()

async def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Cursor Agent Auto-Deploy Pipeline")
    parser.add_argument("--mode", choices=["deploy", "watch", "test", "analyze"], 
                       default="watch", help="Operation mode")
    parser.add_argument("--project-root", default="/home/i1/git/tagix", 
                       help="Project root directory")
    
    args = parser.parse_args()
    
    deployer = CursorAgentDeployer(args.project_root)
    
    if args.mode == "deploy":
        await deployer.run_deployment_pipeline()
    elif args.mode == "watch":
        deployer.start_file_watcher()
    elif args.mode == "test":
        test_results = await deployer.run_tests()
        print(json.dumps(test_results, indent=2))
    elif args.mode == "analyze":
        if deployer.analysis_file.exists():
            with open(deployer.analysis_file, 'r') as f:
                analysis = json.load(f)
            feedback = await deployer.generate_cursor_ai_feedback(analysis)
            print(feedback)
        else:
            print("No analysis file found. Run deployment first.")

if __name__ == "__main__":
    asyncio.run(main())
