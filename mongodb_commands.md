# MongoDB Command Line Database Inspection

## Quick MongoDB Commands

### 1. Connect to MongoDB
```bash
# Connect to local MongoDB
mongosh

# Or connect to specific database
mongosh mobilityhub

# Or connect with connection string
mongosh "mongodb://localhost:27017/mobilityhub"
```

### 2. Basic Database Commands
```bash
# Show all databases
show dbs

# Use specific database
use mobilityhub

# Show all collections
show collections

# Count documents in a collection
db.ride_requests.countDocuments({})
db.ride_matches.countDocuments({})
db.users.countDocuments({})
```

### 3. Inspect Collections

#### Users Collection
```bash
# Count users by role
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])

# Find online users
db.users.find({ is_online: true })

# Find admin users
db.users.find({ role: "admin" })

# Show all users
db.users.find({}, { email: 1, role: 1, is_online: 1, created_at: 1 })
```

#### Ride Requests Collection
```bash
# Count by status
db.ride_requests.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

# Show recent requests
db.ride_requests.find({}).sort({ created_at: -1 }).limit(5)

# Find requests by rider
db.ride_requests.find({ rider_id: "YOUR_RIDER_ID" })

# Find pending requests
db.ride_requests.find({ status: "pending" })
```

#### Ride Matches Collection
```bash
# Count by status
db.ride_matches.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

# Show all matches
db.ride_matches.find({})

# Find matches by driver
db.ride_matches.find({ driver_id: "YOUR_DRIVER_ID" })
```

#### Payments Collection
```bash
# Show all payments
db.payments.find({})

# Count by status
db.payments.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

# Calculate total revenue
db.payments.aggregate([
  { $group: { _id: null, total: { $sum: "$amount" } } }
])
```

#### Audit Logs Collection
```bash
# Show recent audit logs
db.audit_logs.find({}).sort({ timestamp: -1 }).limit(10)

# Count by action
db.audit_logs.aggregate([
  { $group: { _id: "$action", count: { $sum: 1 } } }
])

# Find logs by user
db.audit_logs.find({ user_id: "YOUR_USER_ID" })
```

### 4. Advanced Queries

#### Find All Ride Data for a User
```bash
# Replace USER_ID with actual user ID
db.ride_requests.find({ rider_id: "USER_ID" })
db.ride_matches.find({ $or: [{ rider_id: "USER_ID" }, { driver_id: "USER_ID" }] })
```

#### Find Available Rides for Drivers
```bash
# Find pending requests
db.ride_requests.find({ 
  status: "pending",
  expires_at: { $gt: new Date() }
})
```

#### System Statistics
```bash
# Total users by role
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])

# Total rides by status
db.ride_requests.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

# Total revenue
db.payments.aggregate([
  { $group: { _id: null, total: { $sum: "$amount" } } }
])
```

### 5. Clean Up Commands (Use with caution!)

```bash
# Delete all test data
db.ride_requests.deleteMany({})
db.ride_matches.deleteMany({})
db.payments.deleteMany({})
db.payment_transactions.deleteMany({})
db.audit_logs.deleteMany({})

# Delete specific user's data
db.ride_requests.deleteMany({ rider_id: "USER_ID" })
db.ride_matches.deleteMany({ $or: [{ rider_id: "USER_ID" }, { driver_id: "USER_ID" }] })
```

### 6. Export/Import Data

```bash
# Export collection to JSON
mongoexport --db mobilityhub --collection ride_requests --out ride_requests.json

# Import from JSON
mongoimport --db mobilityhub --collection ride_requests --file ride_requests.json
```

## Quick Status Check Script

Create a file called `quick_db_check.sh`:

```bash
#!/bin/bash
echo "=== MOBILITYHUB DATABASE STATUS ==="
echo "Users: $(mongosh mobilityhub --quiet --eval 'db.users.countDocuments({})')"
echo "Ride Requests: $(mongosh mobilityhub --quiet --eval 'db.ride_requests.countDocuments({})')"
echo "Ride Matches: $(mongosh mobilityhub --quiet --eval 'db.ride_matches.countDocuments({})')"
echo "Payments: $(mongosh mobilityhub --quiet --eval 'db.payments.countDocuments({})')"
echo "Audit Logs: $(mongosh mobilityhub --quiet --eval 'db.audit_logs.countDocuments({})')"
echo "=================================="
```

Make it executable and run:
```bash
chmod +x quick_db_check.sh
./quick_db_check.sh
```
