import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { incidentsApi } from '../api/client';
import { Incident } from '../types';
import { format, formatDistanceToNow } from 'date-fns';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('all');

  const loadIncidents = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await incidentsApi.getAll(params);
      setIncidents(response.data.incidents);
    } catch (error) {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [filter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await incidentsApi.acknowledge(id);
      toast.success('Incident acknowledged');
      loadIncidents();
    } catch (error) {
      toast.error('Failed to acknowledge incident');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await incidentsApi.resolve(id);
      toast.success('Incident resolved');
      loadIncidents();
    } catch (error) {
      toast.error('Failed to resolve incident');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/10';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10';
      case 'LOW': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-red-400 bg-red-500/10';
      case 'ACKNOWLEDGED': return 'text-yellow-400 bg-yellow-500/10';
      case 'RESOLVED': return 'text-green-400 bg-green-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Incidents</h1>
          <p className="text-slate-400">Track and manage monitoring incidents</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {['all', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No incidents
            </h3>
            <p className="text-slate-400">
              All monitored services are operational
            </p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {incident.title}
                  </h3>
                  {incident.monitor && (
                    <p className="text-sm text-slate-400 mb-2">
                      {incident.monitor.name} - {incident.monitor.url}
                    </p>
                  )}
                  {incident.description && (
                    <p className="text-slate-400 text-sm">{incident.description}</p>
                  )}
                </div>

                {incident.status === 'OPEN' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcknowledge(incident.id)}
                      className="px-3 py-1 text-sm bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleResolve(incident.id)}
                      className="px-3 py-1 text-sm bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Started {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                </div>
                {incident.resolvedAt && (
                  <div className="text-green-400">
                    Resolved {formatDistanceToNow(new Date(incident.resolvedAt), { addSuffix: true })}
                  </div>
                )}
                {incident.alerts && incident.alerts.length > 0 && (
                  <div>{incident.alerts.length} alerts sent</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
