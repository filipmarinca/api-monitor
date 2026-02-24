import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Play, Pause, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { monitorsApi, checksApi } from '../api/client';
import { Monitor, CheckStats } from '../types';
import { useMonitorSocket } from '../hooks/useSocket';
import { format } from 'date-fns';

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [stats, setStats] = useState<CheckStats | null>(null);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  const loadMonitor = async () => {
    if (!id) return;
    try {
      const [monitorRes, statsRes] = await Promise.all([
        monitorsApi.getOne(id),
        checksApi.getStats(id, period),
      ]);
      setMonitor(monitorRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load monitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitor();
  }, [id, period]);

  useMonitorSocket(id!, (data) => {
    if (data.monitorId === id) {
      setMonitor((prev) => prev ? { ...prev, latestCheck: data.check } : null);
      loadMonitor(); // Reload stats
    }
  });

  const handleTrigger = async () => {
    if (!id) return;
    try {
      await monitorsApi.trigger(id);
      toast.success('Check triggered');
    } catch (error) {
      toast.error('Failed to trigger check');
    }
  };

  const handleToggleEnabled = async () => {
    if (!id || !monitor) return;
    try {
      await monitorsApi.update(id, { enabled: !monitor.enabled });
      setMonitor({ ...monitor, enabled: !monitor.enabled });
      toast.success(monitor.enabled ? 'Monitor paused' : 'Monitor enabled');
    } catch (error) {
      toast.error('Failed to update monitor');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await monitorsApi.delete(id);
      toast.success('Monitor deleted');
      window.location.href = '/';
    } catch (error) {
      toast.error('Failed to delete monitor');
    }
  };

  if (loading || !monitor) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const chartData = stats?.timeline.map((item) => ({
    time: format(new Date(item.timestamp), 'HH:mm'),
    responseTime: item.responseTime || 0,
    success: item.success,
  })) || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`w-4 h-4 rounded-full ${
                  monitor.latestCheck?.success ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <h1 className="text-3xl font-bold text-white">{monitor.name}</h1>
            </div>
            <p className="text-slate-400">{monitor.url}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTrigger}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title="Trigger check"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleEnabled}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title={monitor.enabled ? 'Pause' : 'Resume'}
            >
              {monitor.enabled ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDelete}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Uptime</p>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {stats?.uptime.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Last {period}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Avg Response</p>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {stats?.responseTime.avg}
            <span className="text-lg text-slate-400 ml-1">ms</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Min: {stats?.responseTime.min}ms, Max: {stats?.responseTime.max}ms
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Total Checks</p>
            <RefreshCw className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.totalChecks}</p>
          <p className="text-xs text-green-400 mt-1">
            {stats?.successfulChecks} successful
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Failed Checks</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.failedChecks}</p>
          <p className="text-xs text-slate-500 mt-1">Last {period}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 mb-6">
        {['1h', '24h', '7d', '30d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Response Time Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">Response Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
              }}
            />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monitor Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Method</p>
            <p className="text-white font-medium">{monitor.method}</p>
          </div>
          <div>
            <p className="text-slate-400">Interval</p>
            <p className="text-white font-medium">{monitor.interval / 1000}s</p>
          </div>
          <div>
            <p className="text-slate-400">Timeout</p>
            <p className="text-white font-medium">{monitor.timeout / 1000}s</p>
          </div>
          <div>
            <p className="text-slate-400">Expected Status</p>
            <p className="text-white font-medium">{monitor.expectedStatus}</p>
          </div>
          <div>
            <p className="text-slate-400">Regions</p>
            <p className="text-white font-medium">{monitor.regions.join(', ')}</p>
          </div>
          <div>
            <p className="text-slate-400">SSL Validation</p>
            <p className="text-white font-medium">
              {monitor.validateSSL ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
