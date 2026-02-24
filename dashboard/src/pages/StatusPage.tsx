import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { statusPagesApi } from '../api/client';
import { StatusPage as StatusPageType } from '../types';
import { format } from 'date-fns';

export default function StatusPage() {
  const { slug } = useParams<{ slug: string }>();
  const [statusPage, setStatusPage] = useState<StatusPageType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatusPage = async () => {
      if (!slug) return;
      try {
        const response = await statusPagesApi.getBySlug(slug);
        setStatusPage(response.data);
      } catch (error) {
        console.error('Failed to load status page');
      } finally {
        setLoading(false);
      }
    };

    loadStatusPage();
    const interval = setInterval(loadStatusPage, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!statusPage) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Status Page Not Found</h1>
          <p className="text-slate-400">The requested status page does not exist</p>
        </div>
      </div>
    );
  }

  const allOperational = statusPage.monitors?.every((m) => m.status === 'operational');

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-blue-500" />
            <h1 className="text-4xl font-bold text-white">{statusPage.title}</h1>
          </div>
          {statusPage.description && (
            <p className="text-slate-400 text-lg">{statusPage.description}</p>
          )}
        </div>

        {/* Overall Status */}
        <div className={`border rounded-lg p-8 mb-8 ${
          allOperational
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}>
          <div className="flex items-center justify-center gap-3">
            {allOperational ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-500" />
                <span className="text-2xl font-bold text-white">All Systems Operational</span>
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8 text-red-500" />
                <span className="text-2xl font-bold text-white">Some Systems Experiencing Issues</span>
              </>
            )}
          </div>
        </div>

        {/* Monitors Status */}
        <div className="space-y-4 mb-12">
          {statusPage.monitors?.map((monitor) => (
            <div
              key={monitor.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {monitor.status === 'operational' ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {monitor.name}
                    </h3>
                    <p className="text-sm text-slate-400">{monitor.url}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-sm font-medium mb-1 ${
                    monitor.status === 'operational' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {monitor.status === 'operational' ? 'Operational' : 'Down'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {monitor.uptime.toFixed(2)}% uptime (30d)
                  </p>
                  {monitor.latestCheck?.responseTime && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-1">
                      <Clock className="w-3 h-3" />
                      {monitor.latestCheck.responseTime}ms
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Incidents */}
        {statusPage.incidents && statusPage.incidents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Recent Incidents</h2>
            <div className="space-y-4">
              {statusPage.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6"
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {incident.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          incident.status === 'RESOLVED'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                      {incident.description && (
                        <p className="text-slate-400 text-sm mb-3">{incident.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>
                          Started: {format(new Date(incident.startedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                        {incident.resolvedAt && (
                          <span className="text-green-400">
                            Resolved: {format(new Date(incident.resolvedAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            Powered by <span className="text-blue-500 font-medium">API Monitor</span>
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm:ss')}
          </p>
        </div>
      </div>
    </div>
  );
}
