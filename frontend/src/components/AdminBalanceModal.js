import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import './ElementIdDisplay.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminBalanceModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName, 
  userEmail, 
  userRole 
}) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    transaction_type: 'credit',
    description: ''
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserBalance();
    }
  }, [isOpen, userId]);

  const fetchUserBalance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/users/${userId}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setBalance(response.data.current_balance);
      setTransactions(response.data.recent_transactions || []);
    } catch (error) {
      console.error('Error fetching user balance:', error);
      toast.error('Failed to fetch user balance');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.description) {
      toast.error('Please fill in all fields');
      return;
    }

    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setTransactionLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/users/${userId}/balance/transaction`,
        {
          user_id: userId,
          amount: amount,
          transaction_type: transactionForm.transaction_type,
          description: transactionForm.description
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(response.data.message);
      setTransactionForm({ amount: '', transaction_type: 'credit', description: '' });
      fetchUserBalance(); // Refresh balance and transactions
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast.error(error.response?.data?.detail || 'Failed to process transaction');
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleClose = () => {
    setTransactionForm({ amount: '', transaction_type: 'credit', description: '' });
    setBalance(0);
    setTransactions([]);
    onClose();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'credit':
        return 'bg-green-100 text-green-800';
      case 'debit':
        return 'bg-red-100 text-red-800';
      case 'refund':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="admin-balance-modal-overlay">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" id="admin-balance-modal-container">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" id="admin-balance-modal-header">
          <div className="flex items-center space-x-2" id="admin-balance-modal-header-info">
            <Wallet className="h-5 w-5 text-green-600" id="admin-balance-modal-header-icon" />
            <CardTitle className="text-lg" id="admin-balance-modal-title">Balance Management</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
            id="admin-balance-modal-close-button"
          >
            <X className="h-4 w-4" id="admin-balance-modal-close-icon" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6" id="admin-balance-modal-content">
          {/* User Info */}
          <div className="bg-gray-50 p-4 rounded-lg" id="admin-balance-modal-user-info">
            <h3 className="font-semibold text-lg" id="admin-balance-modal-user-name">{userName}</h3>
            <p className="text-sm text-gray-600" id="admin-balance-modal-user-email">{userEmail}</p>
            <Badge variant="outline" className="mt-1" id="admin-balance-modal-user-role-badge">
              {userRole}
            </Badge>
          </div>

          {/* Current Balance */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200" id="admin-balance-modal-current-balance">
            <div className="flex items-center justify-between" id="admin-balance-modal-balance-container">
              <div id="admin-balance-modal-balance-info">
                <h3 className="font-semibold text-lg text-green-800" id="admin-balance-modal-balance-label">Current Balance</h3>
                <p className="text-2xl font-bold text-green-900" id="admin-balance-modal-balance-amount">
                  {loading ? 'Loading...' : formatCurrency(balance)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUserBalance}
                disabled={loading}
                className="flex items-center space-x-1"
                id="admin-balance-modal-refresh-button"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} id="admin-balance-modal-refresh-icon" />
                <span id="admin-balance-modal-refresh-text">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Transaction Form */}
          <div className="space-y-4" id="admin-balance-modal-transaction-form">
            <h3 className="font-semibold text-lg" id="admin-balance-modal-transaction-form-title">New Transaction</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="admin-balance-modal-transaction-form-grid">
              <div className="space-y-2" id="admin-balance-modal-amount-field">
                <Label htmlFor="amount" id="admin-balance-modal-amount-label">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2" id="admin-balance-modal-type-field">
                <Label htmlFor="transaction_type" id="admin-balance-modal-type-label">Type</Label>
                <Select 
                  value={transactionForm.transaction_type} 
                  onValueChange={(value) => setTransactionForm(prev => ({ ...prev, transaction_type: value }))}
                >
                  <SelectTrigger id="admin-balance-modal-type-select-trigger">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent id="admin-balance-modal-type-select-content">
                    <SelectItem value="credit" id="admin-balance-modal-type-credit">Credit (Add Money)</SelectItem>
                    <SelectItem value="debit" id="admin-balance-modal-type-debit">Debit (Remove Money)</SelectItem>
                    <SelectItem value="refund" id="admin-balance-modal-type-refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2" id="admin-balance-modal-description-field">
                <Label htmlFor="description" id="admin-balance-modal-description-label">Description</Label>
                <Input
                  id="description"
                  placeholder="Transaction description"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end" id="admin-balance-modal-submit-container">
              <Button
                onClick={handleTransaction}
                disabled={transactionLoading || !transactionForm.amount || !transactionForm.description}
                className="flex items-center space-x-2"
                id="admin-balance-modal-submit-button"
              >
                <DollarSign className="h-4 w-4" id="admin-balance-modal-submit-icon" />
                <span id="admin-balance-modal-submit-text">{transactionLoading ? 'Processing...' : 'Process Transaction'}</span>
              </Button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-4" id="admin-balance-modal-transactions-section">
            <h3 className="font-semibold text-lg" id="admin-balance-modal-transactions-title">Recent Transactions</h3>
            
            {loading ? (
              <div className="text-center py-4" id="admin-balance-modal-transactions-loading">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-4 text-gray-500" id="admin-balance-modal-transactions-empty">No transactions found</div>
            ) : (
              <div className="space-y-2" id="admin-balance-modal-transactions-list">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(transaction.created_at)} • by {transaction.admin_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.amount_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount_change > 0 ? '+' : ''}{formatCurrency(transaction.amount_change)}
                      </p>
                      <Badge className={getTransactionColor(transaction.transaction_type)}>
                        {transaction.transaction_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBalanceModal;
