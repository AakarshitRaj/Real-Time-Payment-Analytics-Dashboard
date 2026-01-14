'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, Download, Play, Pause, Wifi, WifiOff, ChevronLeft, ChevronRight } from 'lucide-react';

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
  hour?: string;
  date?: string;
}

interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
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
  const [trendPeriod, setTrendPeriod] = useState<'hour' | 'day' | 'week'>('hour');
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;

  // Queue to store events when paused
  const pausedEventsQueue = useRef<PaymentEvent[]>([]);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Initialize Socket.IO connection
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
    script.async = true;
    
    script.onload = () => {
      const io = (window as any).io;
      
      if (!io) {
        console.error('Socket.IO failed to load');
        return;
      }
      
      const socketInstance = io('http://localhost:3001', {
        path: '/ws/payments',
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id);
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connected', (data: any) => {
        console.log('Server message:', data);
      });

      socketInstance.on('connect_error', (error: any) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      socketInstance.removeAllListeners('payment_event');
      
      socketInstance.on('payment_event', (eventData: any) => {
        console.log('Received payment_event:', eventData);
        const event: PaymentEvent = {
          type: eventData.type,
          payment: eventData.payment,
          timestamp: typeof eventData.timestamp === 'string' 
            ? eventData.timestamp 
            : new Date(eventData.timestamp).toISOString()
        };
        
        pausedEventsQueue.current.push(event);
      });

      socketInstance.on('error', (error: any) => {
        console.error('Socket error:', error);
      });

      setSocket(socketInstance);
    };

    script.onerror = () => {
      console.error('Failed to load Socket.IO script');
    };

    if ((window as any).io) {
      script.onload(null as any);
    } else {
      document.head.appendChild(script);
    }

    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Process queued events based on pause state
  useEffect(() => {
    if (!isPaused && pausedEventsQueue.current.length > 0) {
      const queuedEvents = [...pausedEventsQueue.current];
      pausedEventsQueue.current = [];
      
      queuedEvents.forEach(event => {
        processPaymentEvent(event);
      });
    }
  }, [isPaused]);

  // Also process events in real-time when not paused
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        if (pausedEventsQueue.current.length > 0 && !isPaused) {
          const event = pausedEventsQueue.current.shift();
          if (event) {
            processPaymentEvent(event);
          }
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // Process a single payment event
  const processPaymentEvent = useCallback((event: PaymentEvent) => {
    const eventId = event.payment._id;
    if (processedEventIds.current.has(eventId)) {
      console.log('Duplicate event detected, skipping:', eventId);
      return;
    }
    processedEventIds.current.add(eventId);
    
    if (processedEventIds.current.size > 1000) {
      const idsArray = Array.from(processedEventIds.current);
      processedEventIds.current = new Set(idsArray.slice(-1000));
    }
    
    setEvents(prev => {
      const newEvents = [event, ...prev].slice(0, 500);
      return newEvents;
    });
    
    setMetrics(prev => {
      const paymentAmount = Number(event.payment.amount);
      const newTotal = prev.totalVolume + paymentAmount;
      const newCount = prev.activePayments + 1;
      const successCount = event.payment.status === 'success' ? 1 : 0;
      
      const prevSuccessCount = (prev.successRate / 100) * prev.activePayments;
      const totalSuccessCount = prevSuccessCount + successCount;
      const newSuccessRate = newCount > 0 ? (totalSuccessCount / newCount) * 100 : 0;
      
      return {
        totalVolume: newTotal,
        successRate: newSuccessRate,
        averageAmount: newTotal / newCount,
        peakHour: prev.peakHour,
        topPaymentMethod: event.payment.method,
        activePayments: newCount
      };
    });
  }, []);

  // Calculate peak hour from events
  const peakHourData = useMemo(() => {
    if (events.length === 0) return { hour: 0, count: 0 };

    const hourCounts = new Map<number, number>();
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let peakHour = 0;
    let maxCount = 0;
    
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    });

    return { hour: peakHour, count: maxCount };
  }, [events]);

  // Update metrics with calculated peak hour
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      peakHour: peakHourData.hour
    }));
  }, [peakHourData]);

  // Generate REAL trend data from actual events
  const trendData = useMemo(() => {
    if (events.length === 0) return [];

    const now = new Date();
    const dataMap = new Map<string, TrendData>();
    
    if (trendPeriod === 'hour') {
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now);
        time.setHours(time.getHours() - i);
        const key = time.toISOString().substring(0, 13);
        dataMap.set(key, {
          timestamp: time.toISOString(),
          amount: 0,
          count: 0,
          successRate: 0,
          hour: time.getHours().toString().padStart(2, '0') + ':00'
        });
      }
    } else if (trendPeriod === 'day') {
      for (let i = 6; i >= 0; i--) {
        const time = new Date(now);
        time.setDate(time.getDate() - i);
        const key = time.toISOString().substring(0, 10);
        dataMap.set(key, {
          timestamp: time.toISOString(),
          amount: 0,
          count: 0,
          successRate: 0,
          date: time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const time = new Date(now);
        time.setDate(time.getDate() - i);
        const key = time.toISOString().substring(0, 10);
        dataMap.set(key, {
          timestamp: time.toISOString(),
          amount: 0,
          count: 0,
          successRate: 0,
          date: time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    }

    events.forEach(event => {
      const eventTime = new Date(event.timestamp);
      let key: string;
      
      if (trendPeriod === 'hour') {
        key = eventTime.toISOString().substring(0, 13);
      } else {
        key = eventTime.toISOString().substring(0, 10);
      }
      
      const bucket = dataMap.get(key);
      if (bucket) {
        bucket.amount += event.payment.amount;
        bucket.count += 1;
        if (event.payment.status === 'success') {
          bucket.successRate += 1;
        }
      }
    });

    dataMap.forEach(bucket => {
      if (bucket.count > 0) {
        bucket.successRate = (bucket.successRate / bucket.count) * 100;
      }
    });

    return Array.from(dataMap.values());
  }, [events, trendPeriod]);

  // Generate REAL payment method data from actual events
  const paymentMethodData = useMemo(() => {
    const methodMap = new Map<string, PaymentMethodData>();
    
    events.forEach(event => {
      const method = event.payment.method;
      const existing = methodMap.get(method);
      
      if (existing) {
        existing.count += 1;
        existing.amount += event.payment.amount;
      } else {
        methodMap.set(method, {
          method: method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' '),
          count: 1,
          amount: event.payment.amount
        });
      }
    });

    return Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount);
  }, [events]);

  // Pagination logic
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = events.slice(startIndex, endIndex);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return trendPeriod === 'hour' 
      ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Payment Analytics</h1>
            <p className="text-slate-400">Real-time payment monitoring & insights</p>
          </div>
          <div className="flex gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isConnected ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Disconnected</span>
                </>
              )}
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={events.length === 0}
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
          <div className="text-sm opacity-80">Last {metrics.activePayments} transactions</div>
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
          <div className="text-3xl font-bold mb-1">
            {metrics.peakHour.toString().padStart(2, '0')}:00
          </div>
          <div className="text-sm opacity-80">
            {peakHourData.count > 0 ? `${peakHourData.count} payments` : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trend Chart */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Payment Trends</h2>
            <div className="flex gap-2">
              {(['hour', 'day', 'week'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setTrendPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    trendPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {period === 'hour' ? '24h' : period === 'day' ? '7d' : '30d'}
                </button>
              ))}
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey={trendPeriod === 'hour' ? 'hour' : 'date'}
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
                  name="Volume (₹)"
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
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              No data available yet
            </div>
          )}
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Payment Methods</h2>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="method" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                <Bar dataKey="amount" fill="#06b6d4" name="Amount (₹)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              No data available yet
            </div>
          )}
        </div>
      </div>

      {/* Live Events Feed with Pagination */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Live Events Feed</h2>
            {isConnected && !isPaused && (
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-pulse">
                LIVE
              </span>
            )}
            {isPaused && (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
                PAUSED
              </span>
            )}
          </div>
          <span className="text-slate-400 text-sm">{events.length} total events</span>
        </div>
        
        <div className="space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {events.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              {!isConnected ? (
                <div className="flex flex-col items-center gap-2">
                  <WifiOff className="w-12 h-12 mb-2" />
                  <p>Connecting to payment server...</p>
                  <p className="text-sm">Make sure the server is running at http://localhost:3001</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Activity className="w-12 h-12 mb-2 animate-pulse" />
                  <p>Waiting for payment events...</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {currentEvents.map((event, idx) => (
                <div
                  key={startIndex + idx}
                  className={`p-4 rounded-lg border-l-4 transition-all hover:bg-slate-700 ${
                    event.payment.status === 'success'
                      ? 'bg-slate-750 border-green-500'
                      : event.payment.status === 'refunded'
                      ? 'bg-slate-750 border-yellow-500'
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
                        : event.payment.status === 'refunded'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {event.payment.status}
                    </span>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="text-slate-400 text-sm">
                    Showing {startIndex + 1}-{Math.min(endIndex, events.length)} of {events.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;