# 🤖 AI Development Rules & Guidelines

## 🚨 CRITICAL: These rules MUST be followed in ALL interactions

### **Rule #1: Always Follow Established Workflow**
- **NEVER** skip the testing phase
- **ALWAYS** use `./run-tests.sh` before committing changes
- **ALWAYS** use `./debug-environment.sh` when troubleshooting
- **NEVER** make changes without following the Docker workflow

### **Rule #2: User Rules Override**
- **ALWAYS** follow the user rule: "Main runtime is on remote server, deployment should be performed over git commit with appropriate change-comment and asking developer to do follow steps"
- **NEVER** attempt direct deployment to production
- **ALWAYS** ask developer to perform deployment steps on remote server

### **Rule #3: Docker-First Approach**
- **ALWAYS** use Docker containers for development
- **NEVER** suggest local installations that bypass Docker
- **ALWAYS** use `./deploy.sh` for deployment
- **NEVER** suggest manual service management

### **Rule #4: Testing is Mandatory**
- **ALWAYS** run tests before suggesting changes are complete
- **NEVER** assume something works without testing
- **ALWAYS** use the established testing framework
- **NEVER** skip integration tests

### **Rule #5: Documentation is Required**
- **ALWAYS** update documentation when making changes
- **NEVER** make changes without documenting them
- **ALWAYS** use conventional commit messages
- **NEVER** commit without proper documentation

## 🛡️ Safety Checks Before Any Action

### Before Making Changes:
1. ✅ Check if changes follow Docker workflow
2. ✅ Verify testing framework will be used
3. ✅ Confirm documentation will be updated
4. ✅ Ensure user rules are followed
5. ✅ Validate deployment process

### Before Suggesting Solutions:
1. ✅ Check if solution uses established tools
2. ✅ Verify solution follows best practices
3. ✅ Confirm solution is testable
4. ✅ Ensure solution is documented
5. ✅ Validate solution follows user rules

## 🚫 What I Will NEVER Do

### **Never Bypass Established Workflow:**
- Skip testing phases
- Suggest manual installations
- Bypass Docker containers
- Ignore documentation requirements
- Skip deployment procedures

### **Never Ignore User Rules:**
- Attempt direct production deployment
- Skip git commit process
- Ignore developer handoff requirements
- Bypass change documentation

### **Never Suggest Unsafe Practices:**
- Manual service management
- Direct database modifications
- Bypassing security measures
- Ignoring error handling
- Skipping validation steps

## ✅ What I Will ALWAYS Do

### **Always Follow Best Practices:**
- Use Docker containers
- Run comprehensive tests
- Update documentation
- Follow git workflow
- Respect user rules

### **Always Provide Safe Solutions:**
- Tested and validated approaches
- Well-documented changes
- Proper error handling
- Security considerations
- Performance optimization

### **Always Ask for Confirmation:**
- Before making breaking changes
- Before modifying core functionality
- Before changing deployment process
- Before updating dependencies
- Before modifying user rules

## 🔄 Standard Response Pattern

### When Asked to Do Something:
1. **Acknowledge** the request
2. **Check** against established rules
3. **Validate** approach follows guidelines
4. **Suggest** proper implementation
5. **Execute** following established workflow
6. **Test** the implementation
7. **Document** the changes
8. **Commit** with proper message

### When Asked to Do Something Wrong:
1. **Politely decline** the incorrect approach
2. **Explain** why it violates guidelines
3. **Suggest** the correct approach
4. **Offer** alternative solutions
5. **Maintain** adherence to rules

## 📋 Checklist for Every Interaction

### Before Starting:
- [ ] Review user rules
- [ ] Check established workflow
- [ ] Validate Docker approach
- [ ] Confirm testing requirements
- [ ] Verify documentation needs

### During Implementation:
- [ ] Follow Docker workflow
- [ ] Use established tools
- [ ] Run tests continuously
- [ ] Update documentation
- [ ] Follow git process

### After Completion:
- [ ] Run comprehensive tests
- [ ] Verify all functionality
- [ ] Update documentation
- [ ] Commit with proper message
- [ ] Ask developer for deployment

## 🎯 Key Principles

### **1. Consistency Over Convenience**
- Always use established tools
- Never take shortcuts
- Maintain consistent approach
- Follow established patterns

### **2. Safety Over Speed**
- Test everything thoroughly
- Validate all changes
- Document all modifications
- Follow security practices

### **3. Collaboration Over Individual Action**
- Respect user rules
- Follow team processes
- Maintain clear communication
- Ensure proper handoffs

### **4. Quality Over Quantity**
- Focus on well-tested solutions
- Prioritize maintainable code
- Ensure proper documentation
- Follow best practices

## 🚨 Emergency Procedures

### When Rules Conflict:
1. **User rules** take highest priority
2. **Security** takes second priority
3. **Testing** takes third priority
4. **Documentation** takes fourth priority
5. **Performance** takes fifth priority

### When Asked to Bypass Rules:
1. **Politely explain** why rules exist
2. **Offer alternative** approaches
3. **Maintain** adherence to guidelines
4. **Suggest** proper implementation
5. **Refuse** to compromise on safety

## 📚 Reference Materials

### **Always Consult:**
- `DEVELOPMENT_WORKFLOW.md` - Development process
- `README.md` - Project overview and Docker setup
- `docker-compose.yml` - Service configuration
- `deploy.sh` - Deployment script
- `run-tests.sh` - Testing framework
- `debug-environment.sh` - Debugging tools

### **Always Use:**
- Docker containers for all services
- Established testing framework
- Proper git workflow
- Comprehensive documentation
- User-defined deployment process

## 🔒 Commitment Statement

**I commit to:**
- Always follow these rules
- Never compromise on safety
- Maintain consistent approach
- Respect user requirements
- Provide quality solutions
- Follow established workflow
- Test all changes thoroughly
- Document all modifications
- Use proper deployment process
- Maintain security standards

**I will never:**
- Bypass established workflow
- Skip testing phases
- Ignore user rules
- Suggest unsafe practices
- Compromise on quality
- Skip documentation
- Bypass security measures
- Ignore best practices
- Take shortcuts
- Compromise on safety

---

## 🎯 Quick Reference

### **Before Every Action:**
1. Check user rules
2. Follow Docker workflow
3. Use established tools
4. Run tests
5. Update documentation

### **When in Doubt:**
1. Consult established guidelines
2. Use debugging tools
3. Run comprehensive tests
4. Ask for clarification
5. Follow safest approach

### **Emergency Response:**
1. Stop and assess
2. Check against rules
3. Use debugging tools
4. Follow established procedures
5. Document everything

---

**These rules are non-negotiable and must be followed in ALL interactions.**
