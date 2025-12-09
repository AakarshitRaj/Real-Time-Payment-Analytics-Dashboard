'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, Download, Play, Pause } from 'lucide-react';

// Types
interface Payment {
  _id: string;
  tenantId: string;
  amount: number;
  method: string;
  status: 'success' | 'failed' | 'refunded';
  createdAt: string;
}

interface PaymentEvent {
  type: 'payment_received' | 'payment_failed' | 'payment_refunded';
  payment: Payment;
  timestamp: string;
}

interface PaymentMetrics {
  totalVolume: number;
  successRate: number;
  averageAmount: number;
  peakHour: number;
  topPaymentMethod: string;
  activePayments: number;
}

interface TrendData {
  timestamp: string;
  amount: number;
  count: number;
  successRate: number;
}

class MockWebSocket {
  private handlers: { [key: string]: Function[] } = {};
  private interval: NodeJS.Timeout | null = null;
  
  addEventListener(event: string, handler: Function) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }
  
  removeEventListener(event: string, handler: Function) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter(h => h !== handler);
    }
  }
  
  start() {
    this.interval = setInterval(() => {
      const payment: Payment = {
        _id: Math.random().toString(36).substr(2, 9),
        tenantId: 'tenant_1',
        amount: Math.floor(Math.random() * 5000) + 100,
        method: ['card', 'bank_transfer', 'crypto', 'paypal'][Math.floor(Math.random() * 4)],
        status: Math.random() > 0.15 ? 'success' : 'failed',
        createdAt: new Date().toISOString()
      };
      
      const event: PaymentEvent = {
        type: payment.status === 'failed' ? 'payment_failed' : 'payment_received',
        payment,
        timestamp: new Date().toISOString()
      };
      
      this.handlers['message']?.forEach(h => h({ data: JSON.stringify(event) }));
    }, 2000);
  }
  
  close() {
    if (this.interval) clearInterval(this.interval);
  }
}

const Dashboard = () => {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalVolume: 0,
    successRate: 0,
    averageAmount: 0,
    peakHour: 0,
    topPaymentMethod: '',
    activePayments: 0
  });
  const [trendPeriod, setTrendPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [isPaused, setIsPaused] = useState(false);
  const [ws, setWs] = useState<MockWebSocket | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const mockWs = new MockWebSocket();
    
    const handleMessage = (e: MessageEvent) => {
      const event: PaymentEvent = JSON.parse(e.data);
      
      if (!isPaused) {
        setEvents(prev => [event, ...prev].slice(0, 100));
        
        setMetrics(prev => {
          const newTotal = prev.totalVolume + event.payment.amount;
          const newCount = prev.activePayments + 1;
          const successCount = event.payment.status === 'success' ? 1 : 0;
          const totalSuccess = (prev.successRate * prev.activePayments + successCount) / newCount;
          
          return {
            totalVolume: newTotal,
            successRate: totalSuccess * 100,
            averageAmount: newTotal / newCount,
            peakHour: new Date().getHours(),
            topPaymentMethod: event.payment.method,
            activePayments: newCount
          };
        });
      }
    };
    
    mockWs.addEventListener('message', handleMessage);
    mockWs.start();
    setWs(mockWs);
    
    return () => {
      mockWs.close();
    };
  }, [isPaused]);

  // Generate trend data
  const trendData = useMemo(() => {
    const now = new Date();
    const data: TrendData[] = [];
    const points = trendPeriod === 'day' ? 24 : trendPeriod === 'week' ? 7 : 30;
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      if (trendPeriod === 'day') {
        timestamp.setHours(timestamp.getHours() - i);
      } else if (trendPeriod === 'week') {
        timestamp.setDate(timestamp.getDate() - i);
      } else {
        timestamp.setDate(timestamp.getDate() - i);
      }
      
      data.push({
        timestamp: timestamp.toISOString(),
        amount: Math.floor(Math.random() * 50000) + 10000,
        count: Math.floor(Math.random() * 100) + 20,
        successRate: 75 + Math.random() * 20
      });
    }
    
    return data;
  }, [trendPeriod]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const csv = [
      ['Timestamp', 'Type', 'Amount', 'Method', 'Status'],
      ...events.map(e => [
        e.timestamp,
        e.type,
        e.payment.amount,
        e.payment.method,
        e.payment.status
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${Date.now()}.csv`;
    a.click();
  }, [events]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return trendPeriod === 'day' 
      ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Payment Analytics</h1>
            <p className="text-slate-400">Real-time payment monitoring & insights</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Total Volume</span>
          </div>
          <div className="text-3xl font-bold mb-1">{formatCurrency(metrics.totalVolume)}</div>
          <div className="text-sm opacity-80">{metrics.activePayments} payments</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Success Rate</span>
          </div>
          <div className="text-3xl font-bold mb-1">{metrics.successRate.toFixed(1)}%</div>
          <div className="text-sm opacity-80">Last 100 transactions</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Avg Amount</span>
          </div>
          <div className="text-3xl font-bold mb-1">{formatCurrency(metrics.averageAmount)}</div>
          <div className="text-sm opacity-80">Per transaction</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">Peak Hour</span>
          </div>
          <div className="text-3xl font-bold mb-1">{metrics.peakHour}:00</div>
          <div className="text-sm opacity-80">{metrics.topPaymentMethod || 'N/A'}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trend Chart */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Payment Trends</h2>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setTrendPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    trendPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Volume ($)"
              />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Success Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Payment Methods</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { method: 'Card', count: 45, amount: 125000 },
              { method: 'Bank', count: 32, amount: 98000 },
              { method: 'Crypto', count: 18, amount: 67000 },
              { method: 'PayPal', count: 25, amount: 54000 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="method" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Count" />
              <Bar dataKey="amount" fill="#06b6d4" name="Amount ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Events Feed */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Live Events Feed</h2>
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <span className="text-slate-400 text-sm">{events.length} events</span>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              Waiting for payment events...
            </div>
          ) : (
            events.map((event, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 transition-all hover:bg-slate-700 ${
                  event.payment.status === 'success'
                    ? 'bg-slate-750 border-green-500'
                    : 'bg-slate-750 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {event.payment.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-white font-medium">
                        {event.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-white ml-2 font-semibold">
                          {formatCurrency(event.payment.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Method:</span>
                        <span className="text-white ml-2 capitalize">
                          {event.payment.method}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.payment.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {event.payment.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;