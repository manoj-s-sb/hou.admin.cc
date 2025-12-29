import { useEffect, useState } from 'react';

import { Calendar, CheckCircle2, Clock, CreditCard, TrendingUp, UserCheck, UserPlus, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ChartCard from './components/ChartCard';
import StatCard from './components/StatCard';

// Mock data - Replace with actual API data when available
const mockStats = {
  slots: {
    total: 450,
    active: 320,
    booked: 280,
    available: 40,
  },
  inductions: {
    total: 156,
    pending: 28,
    completed: 98,
    inProgress: 30,
  },
  users: {
    total: 1248,
    active: 1050,
    inactive: 198,
  },
  subscriptions: {
    premium: 345,
    standard: 678,
    total: 1023,
    expired: 56,
  },
  analytics: {
    monthlyBookings: [
      { month: 'Jan', bookings: 320, revenue: 45000 },
      { month: 'Feb', bookings: 380, revenue: 52000 },
      { month: 'Mar', bookings: 420, revenue: 58000 },
      { month: 'Apr', bookings: 390, revenue: 54000 },
      { month: 'May', bookings: 450, revenue: 62000 },
      { month: 'Jun', bookings: 520, revenue: 72000 },
    ],
    userGrowth: [
      { month: 'Jan', users: 850 },
      { month: 'Feb', users: 920 },
      { month: 'Mar', users: 980 },
      { month: 'Apr', users: 1050 },
      { month: 'May', users: 1150 },
      { month: 'Jun', users: 1248 },
    ],
    subscriptionDistribution: [
      { name: 'Premium', value: 345 },
      { name: 'Standard', value: 678 },
    ],
  },
};

const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981'];

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  // Using dummy data for now - API integration will be done later
  const displayStats = mockStats;

  useEffect(() => {
    // Fetch dashboard stats - uncomment when API is ready
    // dispatch(getDashboardStats());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">Welcome back! Here&apos;s your overview</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              selectedPeriod === '7days'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedPeriod('7days')}
          >
            7 Days
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              selectedPeriod === '30days'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedPeriod('30days')}
          >
            30 Days
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              selectedPeriod === '6months'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedPeriod('6months')}
          >
            6 Months
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Slots Card */}
        <StatCard
          gradient="from-indigo-600 to-blue-600"
          icon={<Calendar className="h-7 w-7 text-white" />}
          subStats={[
            { label: 'Total Booked', value: displayStats.slots.active, color: 'bg-green-500' },
            { label: 'Total Played', value: displayStats.slots.booked, color: 'bg-blue-500' },
            { label: 'Available', value: displayStats.slots.available, color: 'bg-yellow-500' },
          ]}
          title="Total Slots"
          value={displayStats.slots.total}
        />

        {/* Inductions Card */}
        <StatCard
          gradient="from-purple-600 to-pink-600"
          icon={<UserCheck className="h-7 w-7 text-white" />}
          subStats={[
            { label: 'Completed', value: displayStats.inductions.completed, color: 'bg-green-500' },
            { label: 'In Progress', value: displayStats.inductions.inProgress, color: 'bg-blue-500' },
            { label: 'Pending', value: displayStats.inductions.pending, color: 'bg-yellow-500' },
          ]}
          title="Inductions"
          value={displayStats.inductions.total}
        />

        {/* Users Card */}
        <StatCard
          gradient="from-blue-600 to-cyan-600"
          icon={<Users className="h-7 w-7 text-white" />}
          subStats={[
            { label: 'Active Users', value: displayStats.users.active, color: 'bg-green-500' },
            { label: 'Inactive', value: displayStats.users.inactive, color: 'bg-gray-400' },
          ]}
          title="Total Users"
          value={displayStats.users.total}
        />

        {/* Subscriptions Card */}
        <StatCard
          gradient="from-green-600 to-emerald-600"
          icon={<CreditCard className="h-7 w-7 text-white" />}
          subStats={[
            { label: 'Premium', value: displayStats.subscriptions.premium, color: 'bg-purple-500' },
            { label: 'Standard', value: displayStats.subscriptions.standard, color: 'bg-blue-500' },
            { label: 'Expired', value: displayStats.subscriptions.expired, color: 'bg-red-500' },
          ]}
          title="Subscriptions"
          value={displayStats.subscriptions.total}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Bookings Chart */}
        <ChartCard subtitle="Track bookings and revenue trends" title="Monthly Bookings &amp; Revenue">
          <ResponsiveContainer height={300} width="100%">
            <AreaChart data={displayStats.analytics.monthlyBookings}>
              <defs>
                <linearGradient id="colorBookings" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 600 }} />
              <Area
                dataKey="bookings"
                fill="url(#colorBookings)"
                name="Bookings"
                stroke={COLORS.primary}
                strokeWidth={3}
                type="monotone"
              />
              <Area
                dataKey="revenue"
                fill="url(#colorRevenue)"
                name="Revenue ($)"
                stroke={COLORS.success}
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* User Growth Chart */}
        <ChartCard subtitle="Monitor user acquisition over time" title="User Growth">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={displayStats.analytics.userGrowth}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 600 }} />
              <Bar dataKey="users" fill={COLORS.info} name="Total Users" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Subscription Distribution */}
        <div className="lg:col-span-1">
          <ChartCard subtitle="Premium vs Standard plans" title="Subscription Distribution">
            <ResponsiveContainer height={300} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={displayStats.analytics.subscriptionDistribution}
                  dataKey="value"
                  innerRadius={60}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  outerRadius={100}
                >
                  {displayStats.analytics.subscriptionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2">
          <ChartCard subtitle="Key performance indicators" title="Quick Stats">
            <div className="grid grid-cols-2 gap-4">
              {/* Stat Item 1 */}
              <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((displayStats.inductions.completed / displayStats.inductions.total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Stat Item 2 */}
              <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Active Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((displayStats.users.active / displayStats.users.total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Stat Item 3 */}
              <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Slot Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((displayStats.slots.booked / displayStats.slots.total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Stat Item 4 */}
              <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-yellow-600 shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Pending Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{displayStats.inductions.pending}</p>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
