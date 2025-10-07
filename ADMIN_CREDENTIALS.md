# 🔐 Admin Credentials

## Default Admin Account

### **Login Credentials:**
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Role:** `admin`
- **Name:** `Test Admin`

### **How to Access Admin Dashboard:**

1. **Via Frontend:**
   - Go to: http://localhost:3000
   - Click "Get Started" → "Login"
   - Enter credentials above
   - Navigate to Admin Dashboard

2. **Via API:**
   ```bash
   # Login to get token
   curl -X POST http://localhost:8001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@test.com",
       "password": "admin123"
     }'
   
   # Use token for admin endpoints
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8001/api/admin/stats
   ```

### **Admin Dashboard Features:**

#### 📊 Platform Overview
- Total users, drivers, and riders
- Active rides and completion rates
- Revenue tracking and analytics
- System health monitoring

#### 👥 User Management
- View all registered users
- Monitor driver approval status
- Track user activity and ratings
- Manage user roles and permissions

#### 🚗 Ride Monitoring
- Real-time ride tracking
- View ride history and status
- Monitor payment transactions
- Generate platform reports

#### 📈 System Analytics
- Performance metrics and KPIs
- Growth insights and trends
- Revenue analysis
- Driver utilization rates

### **Database Access:**

```bash
# Connect to MongoDB
docker exec -it tagix-mongodb mongosh tagix_db -u admin -p password123 --authenticationDatabase admin

# View admin users
db.users.find({role: 'admin'}).pretty()

# View all users
db.users.find().pretty()

# View ride data
db.ride_matches.find().pretty()
```

### **Admin API Endpoints:**

```bash
# Get platform statistics
GET /api/admin/stats

# Get all users
GET /api/admin/users

# Get all rides
GET /api/admin/rides

# Get audit logs
GET /api/admin/audit-logs
```

### **Security Notes:**

⚠️ **Important:** These are default credentials for development/testing purposes.

**For production deployment:**
1. Change the default password
2. Use strong, unique credentials
3. Enable additional security measures
4. Consider multi-factor authentication

### **Creating Additional Admin Users:**

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@domain.com",
    "password": "your-secure-password",
    "name": "Your Admin Name",
    "phone": "+1234567890",
    "role": "admin"
  }'
```

---

## 🎯 Quick Access

**Frontend Admin Dashboard:** http://localhost:3000/admin  
**Backend API:** http://localhost:8001/docs  
**Database:** MongoDB on localhost:27018  

**Current Admin User ID:** `922ae55f-7e0d-4073-b4e1-392abe7c6fd1`
