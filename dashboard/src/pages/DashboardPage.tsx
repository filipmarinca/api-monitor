import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { monitorsApi } from '../api/client';
import { Monitor } from '../types';
import { useSocket } from '../hooks/useSocket';
import CreateMonitorModal from '../components/CreateMonitorModal';

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { socket, connected } = useSocket();

  const loadMonitors = async () => {
    try {
      const response = await monitorsApi.getAll();
      setMonitors(response.data);
    } catch (error: any) {
      toast.error('Failed to load monitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitors();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('check:completed', (data) => {
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === data.monitorId
            ? { ...m, latestCheck: data.check }
            : m
        )
      );
    });

    socket.on('incident:created', () => {
      loadMonitors();
    });

    socket.on('incident:resolved', () => {
      loadMonitors();
    });

    return () => {
      socket.off('check:completed');
      socket.off('incident:created');
      socket.off('incident:resolved');
    };
  }, [socket]);

  const getStatusColor = (monitor: Monitor) => {
    if (!monitor.enabled) return 'bg-slate-600';
    if (!monitor.latestCheck) return 'bg-yellow-500';
    return monitor.latestCheck.success ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = (monitor: Monitor) => {
    if (!monitor.enabled) return 'Paused';
    if (!monitor.latestCheck) return 'Pending';
    return monitor.latestCheck.success ? 'Operational' : 'Down';
  };

  const calculateUptime = (monitor: Monitor) => {
    // This would need real calculation from stats
    return monitor.latestCheck?.success ? 99.9 : 95.0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">
            Monitor your APIs in real-time
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Monitor
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Total Monitors</p>
            <Monitor className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white">{monitors.length}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Operational</p>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {monitors.filter((m) => m.enabled && m.latestCheck?.success).length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Down</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {monitors.filter((m) => m.enabled && m.latestCheck && !m.latestCheck.success).length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Avg Response</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {Math.round(
              monitors
                .filter((m) => m.latestCheck?.responseTime)
                .reduce((sum, m) => sum + (m.latestCheck?.responseTime || 0), 0) /
                monitors.filter((m) => m.latestCheck?.responseTime).length || 0
            )}
            <span className="text-lg text-slate-400 ml-1">ms</span>
          </p>
        </div>
      </div>

      {/* Monitors List */}
      <div className="space-y-4">
        {monitors.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No monitors yet
            </h3>
            <p className="text-slate-400 mb-6">
              Create your first monitor to start tracking API uptime and performance
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Monitor
            </button>
          </div>
        ) : (
          monitors.map((monitor) => (
            <Link
              key={monitor.id}
              to={`/monitors/${monitor.id}`}
              className="block bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`w-3 h-3 rounded-full ${getStatusColor(monitor)}`}
                    />
                    <h3 className="text-lg font-semibold text-white">
                      {monitor.name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-slate-800 text-slate-300 rounded">
                      {monitor.method}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{monitor.url}</p>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-white font-medium">
                        {getStatusText(monitor)}
                      </span>
                    </div>
                    {monitor.latestCheck?.responseTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-white">
                          {monitor.latestCheck.responseTime}ms
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Uptime:</span>
                      <span className="text-white font-medium">
                        {calculateUptime(monitor)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {monitor.latestCheck && (
                    <span className="text-xs text-slate-500">
                      Last check: {new Date(monitor.latestCheck.createdAt).toLocaleTimeString()}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {monitor._count?.checks || 0} checks
                    </span>
                    {(monitor._count?.incidents || 0) > 0 && (
                      <span className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded">
                        {monitor._count?.incidents} incidents
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateMonitorModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadMonitors();
          }}
        />
      )}
    </div>
  );
}
