#!/bin/bash

echo "🔍 MOBILITYHUB DATABASE QUICK CHECK"
echo "=================================="

# Check if MongoDB is running locally
if command -v mongosh &> /dev/null; then
    echo "📊 MongoDB Local Connection:"
    echo "Users: $(mongosh mobilityhub --quiet --eval 'db.users.countDocuments({})' 2>/dev/null || echo 'Not accessible')"
    echo "Ride Requests: $(mongosh mobilityhub --quiet --eval 'db.ride_requests.countDocuments({})' 2>/dev/null || echo 'Not accessible')"
    echo "Ride Matches: $(mongosh mobilityhub --quiet --eval 'db.ride_matches.countDocuments({})' 2>/dev/null || echo 'Not accessible')"
    echo "Payments: $(mongosh mobilityhub --quiet --eval 'db.payments.countDocuments({})' 2>/dev/null || echo 'Not accessible')"
    echo "Audit Logs: $(mongosh mobilityhub --quiet --eval 'db.audit_logs.countDocuments({})' 2>/dev/null || echo 'Not accessible')"
else
    echo "⚠️ MongoDB shell (mongosh) not found"
fi

echo ""
echo "🌐 API-Based Database Check:"
python3 check_db_via_api.py 2>/dev/null | grep -E "(✅|❌|📊|👥|🚗|💰|📝)" | head -20

echo ""
echo "🔧 Available Commands:"
echo "  python3 check_db_via_api.py     - Full database state via API"
echo "  source backend/venv/bin/activate && python3 check_database_state.py - Direct MongoDB connection (with venv)"
echo "  mongosh mobilityhub             - Connect to MongoDB directly"
echo "  cat mongodb_commands.md         - MongoDB command reference"
echo ""
echo "💡 To run check_database_state.py:"
echo "  1. Activate virtual environment: source backend/venv/bin/activate"
echo "  2. Run script: python3 check_database_state.py"
echo "  3. Deactivate when done: deactivate"
