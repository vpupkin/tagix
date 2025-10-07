#!/usr/bin/env python3

"""
User Role Fix Script
Fixes incorrect user roles and validates role assignments
"""

import requests
import json
from datetime import datetime

class UserRoleFixer:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.admin_token = None
        
    def login_admin(self):
        """Login as admin to get token"""
        login_data = {
            "email": "admin@test.com",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['access_token']
                print("✅ Admin login successful")
                return True
            else:
                print(f"❌ Admin login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_all_users(self):
        """Get all users from admin API"""
        if not self.admin_token:
            print("❌ No admin token available")
            return None
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/api/admin/users", headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get users: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting users: {e}")
            return None
    
    def analyze_user_roles(self):
        """Analyze user roles and identify issues"""
        users = self.get_all_users()
        if not users:
            return
            
        print("\n📊 User Role Analysis:")
        print("=" * 50)
        
        role_counts = {"admin": 0, "driver": 0, "rider": 0}
        issues = []
        
        for user in users:
            email = user.get('email', 'Unknown')
            name = user.get('name', 'Unknown')
            role = user.get('role', 'Unknown')
            
            role_counts[role] = role_counts.get(role, 0) + 1
            
            # Check for potential role issues
            if email.endswith('@yourdomain.com'):
                if 'driver' in email and role != 'driver':
                    issues.append({
                        'user': name,
                        'email': email,
                        'current_role': role,
                        'expected_role': 'driver',
                        'issue': 'Email suggests driver but role is different'
                    })
                elif 'rider' in email and role != 'rider':
                    issues.append({
                        'user': name,
                        'email': email,
                        'current_role': role,
                        'expected_role': 'rider',
                        'issue': 'Email suggests rider but role is different'
                    })
        
        # Display role counts
        print(f"👥 Total Users: {len(users)}")
        print(f"👨‍💼 Admins: {role_counts['admin']}")
        print(f"🚗 Drivers: {role_counts['driver']}")
        print(f"🚶 Riders: {role_counts['rider']}")
        
        # Display issues
        if issues:
            print(f"\n⚠️  Found {len(issues)} potential role issues:")
            for issue in issues:
                print(f"   • {issue['user']} ({issue['email']})")
                print(f"     Current: {issue['current_role']}, Expected: {issue['expected_role']}")
                print(f"     Issue: {issue['issue']}")
        else:
            print("\n✅ No role issues detected!")
        
        return issues
    
    def fix_user_role(self, user_id, new_role):
        """Fix a user's role (would need backend endpoint)"""
        print(f"🔧 Would fix user {user_id} to role {new_role}")
        # This would require a backend endpoint to update user roles
        # For now, we'll just report what needs to be fixed
    
    def validate_role_assignments(self):
        """Validate that role assignments make sense"""
        users = self.get_all_users()
        if not users:
            return
            
        print("\n🔍 Role Assignment Validation:")
        print("=" * 50)
        
        for user in users:
            email = user.get('email', '')
            name = user.get('name', 'Unknown')
            role = user.get('role', 'Unknown')
            
            # Check email patterns
            if 'admin' in email.lower():
                expected_role = 'admin'
            elif 'driver' in email.lower():
                expected_role = 'driver'
            elif 'rider' in email.lower():
                expected_role = 'rider'
            else:
                expected_role = None
            
            if expected_role and role != expected_role:
                print(f"⚠️  {name} ({email})")
                print(f"   Current role: {role}")
                print(f"   Expected role: {expected_role}")
            else:
                print(f"✅ {name} ({email}) - Role: {role}")

def main():
    print("🔧 User Role Fix Script")
    print("=" * 30)
    
    fixer = UserRoleFixer()
    
    # Login as admin
    if not fixer.login_admin():
        return
    
    # Analyze user roles
    issues = fixer.analyze_user_roles()
    
    # Validate role assignments
    fixer.validate_role_assignments()
    
    if issues:
        print(f"\n📝 Summary:")
        print(f"   Found {len(issues)} users with potential role issues")
        print(f"   These should be reviewed and corrected manually")
    else:
        print(f"\n🎉 All user roles appear to be correct!")

if __name__ == "__main__":
    main()
