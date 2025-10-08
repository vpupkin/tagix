#!/usr/bin/env node

// CREATE ADMIN USER SCRIPT
// This script creates an admin user for testing

console.log('👑 CREATING ADMIN USER\n');
console.log('=====================\n');

const baseUrl = 'http://localhost:8001';

async function createAdminUser() {
    console.log('Creating admin user...');
    
    try {
        const response = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Admin User',
                email: 'admin@test.com',
                password: 'adminpass123',
                phone: '+1234567890',
                role: 'admin'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Admin user created successfully');
            console.log(`   Admin ID: ${data.user.id}`);
            console.log(`   Email: ${data.user.email}`);
            console.log(`   Role: ${data.user.role}`);
            return true;
        } else {
            const errorData = await response.json();
            if (errorData.detail && errorData.detail.includes('already exists')) {
                console.log('ℹ️  Admin user already exists');
                return true;
            } else {
                console.log(`❌ Failed to create admin user: ${response.status}`);
                console.log(`   Error: ${errorData.detail || 'Unknown error'}`);
                return false;
            }
        }
    } catch (error) {
        console.log(`❌ Error creating admin user: ${error.message}`);
        return false;
    }
}

async function main() {
    const success = await createAdminUser();
    
    if (success) {
        console.log('\n🎉 Admin user setup complete!');
        console.log('You can now test admin notifications.');
    } else {
        console.log('\n❌ Failed to setup admin user');
    }
}

main().catch(console.error);
