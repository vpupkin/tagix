#!/bin/bash

# AI Rules Validation Script
# This script validates that all actions follow the established rules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 AI Rules Validation${NC}"
echo "======================"

# Check if critical files exist
check_critical_files() {
    echo -e "${YELLOW}📋 Checking critical files...${NC}"
    
    local files=(
        "CRITICAL_RULES_REMINDER.md"
        "AI_DEVELOPMENT_RULES.md"
        "DEVELOPMENT_WORKFLOW.md"
        "docker-compose.yml"
        "deploy.sh"
        "run-tests.sh"
        "debug-environment.sh"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            echo -e "${GREEN}✅ $file exists${NC}"
        else
            echo -e "${RED}❌ $file missing${NC}"
            return 1
        fi
    done
}

# Check if Docker workflow is being followed
check_docker_workflow() {
    echo -e "${YELLOW}🐳 Checking Docker workflow...${NC}"
    
    # Check if containers are running
    if docker ps | grep -q "tagix-"; then
        echo -e "${GREEN}✅ Docker containers are running${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker containers not running (use ./deploy.sh)${NC}"
    fi
    
    # Check if docker-compose.yml exists and is valid
    if docker-compose config > /dev/null 2>&1; then
        echo -e "${GREEN}✅ docker-compose.yml is valid${NC}"
    else
        echo -e "${RED}❌ docker-compose.yml is invalid${NC}"
        return 1
    fi
}

# Check if testing framework is available
check_testing_framework() {
    echo -e "${YELLOW}🧪 Checking testing framework...${NC}"
    
    if [[ -f "run-tests.sh" && -x "run-tests.sh" ]]; then
        echo -e "${GREEN}✅ Testing framework is available${NC}"
    else
        echo -e "${RED}❌ Testing framework is missing or not executable${NC}"
        return 1
    fi
    
    if [[ -f "debug-environment.sh" && -x "debug-environment.sh" ]]; then
        echo -e "${GREEN}✅ Debugging framework is available${NC}"
    else
        echo -e "${RED}❌ Debugging framework is missing or not executable${NC}"
        return 1
    fi
}

# Check if documentation is up to date
check_documentation() {
    echo -e "${YELLOW}📚 Checking documentation...${NC}"
    
    if [[ -f "README.md" ]]; then
        echo -e "${GREEN}✅ README.md exists${NC}"
    else
        echo -e "${RED}❌ README.md missing${NC}"
        return 1
    fi
    
    if [[ -f "DEVELOPMENT_WORKFLOW.md" ]]; then
        echo -e "${GREEN}✅ Development workflow documented${NC}"
    else
        echo -e "${RED}❌ Development workflow not documented${NC}"
        return 1
    fi
}

# Check git workflow
check_git_workflow() {
    echo -e "${YELLOW}📝 Checking git workflow...${NC}"
    
    if git status > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Git repository is valid${NC}"
        
        # Check if there are uncommitted changes
        if git diff --quiet && git diff --cached --quiet; then
            echo -e "${GREEN}✅ No uncommitted changes${NC}"
        else
            echo -e "${YELLOW}⚠️  There are uncommitted changes${NC}"
        fi
    else
        echo -e "${RED}❌ Not in a git repository${NC}"
        return 1
    fi
}

# Check user rules compliance
check_user_rules() {
    echo -e "${YELLOW}👤 Checking user rules compliance...${NC}"
    
    # Check if deployment script follows user rules
    if grep -q "git commit" deploy.sh 2>/dev/null; then
        echo -e "${GREEN}✅ Deployment script follows git commit workflow${NC}"
    else
        echo -e "${YELLOW}⚠️  Deployment script may not follow git commit workflow${NC}"
    fi
    
    # Check if documentation mentions remote server deployment
    if grep -q "remote server" README.md 2>/dev/null; then
        echo -e "${GREEN}✅ Documentation mentions remote server deployment${NC}"
    else
        echo -e "${YELLOW}⚠️  Documentation may not mention remote server deployment${NC}"
    fi
}

# Main validation function
main() {
    echo -e "${BLUE}🔍 Validating AI rules compliance...${NC}"
    echo "=================================="
    
    local validation_results=()
    
    # Run all checks
    if check_critical_files; then
        validation_results+=("Critical Files: ✅ PASSED")
    else
        validation_results+=("Critical Files: ❌ FAILED")
    fi
    
    if check_docker_workflow; then
        validation_results+=("Docker Workflow: ✅ PASSED")
    else
        validation_results+=("Docker Workflow: ❌ FAILED")
    fi
    
    if check_testing_framework; then
        validation_results+=("Testing Framework: ✅ PASSED")
    else
        validation_results+=("Testing Framework: ❌ FAILED")
    fi
    
    if check_documentation; then
        validation_results+=("Documentation: ✅ PASSED")
    else
        validation_results+=("Documentation: ❌ FAILED")
    fi
    
    if check_git_workflow; then
        validation_results+=("Git Workflow: ✅ PASSED")
    else
        validation_results+=("Git Workflow: ❌ FAILED")
    fi
    
    if check_user_rules; then
        validation_results+=("User Rules: ✅ PASSED")
    else
        validation_results+=("User Rules: ❌ FAILED")
    fi
    
    # Print results
    echo ""
    echo -e "${BLUE}📊 Validation Results${NC}"
    echo "=================="
    for result in "${validation_results[@]}"; do
        echo -e "$result"
    done
    
    # Check if any validations failed
    local failed_validations=0
    for result in "${validation_results[@]}"; do
        if [[ $result == *"❌ FAILED"* ]]; then
            ((failed_validations++))
        fi
    done
    
    if [[ $failed_validations -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}🎉 All validations passed! Rules are being followed.${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ $failed_validations validation(s) failed${NC}"
        echo -e "${YELLOW}⚠️  Please review and fix the issues above${NC}"
        exit 1
    fi
}

# Run validation
main "$@"
