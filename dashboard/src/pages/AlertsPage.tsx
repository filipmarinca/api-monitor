import { useEffect, useState } from 'react';
import { Plus, Trash2, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { alertsApi, monitorsApi } from '../api/client';
import { AlertRule, Monitor } from '../types';

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadRules = async () => {
    try {
      const [rulesRes, monitorsRes] = await Promise.all([
        alertsApi.getRules(),
        monitorsApi.getAll(),
      ]);
      setRules(rulesRes.data);
      setMonitors(monitorsRes.data);
    } catch (error) {
      toast.error('Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      await alertsApi.updateRule(id, { enabled: !enabled });
      toast.success(enabled ? 'Alert rule disabled' : 'Alert rule enabled');
      loadRules();
    } catch (error) {
      toast.error('Failed to update alert rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this alert rule?')) return;
    try {
      await alertsApi.deleteRule(id);
      toast.success('Alert rule deleted');
      loadRules();
    } catch (error) {
      toast.error('Failed to delete alert rule');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Alert Rules</h1>
          <p className="text-slate-400">Configure notifications for your monitors</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Rule
        </button>
      </div>

      {/* Alert Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              No alert rules
            </h3>
            <p className="text-slate-400 mb-6">
              Create alert rules to get notified when monitors fail
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                    {rule.enabled ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded">
                        <Power className="w-3 h-3" />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded">
                        <PowerOff className="w-3 h-3" />
                        Disabled
                      </span>
                    )}
                  </div>
                  
                  {rule.monitor && (
                    <p className="text-sm text-slate-400 mb-3">{rule.monitor.name}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Condition: </span>
                      <span className="text-white">{rule.condition}</span>
                    </div>
                    {rule.threshold && (
                      <div>
                        <span className="text-slate-400">Threshold: </span>
                        <span className="text-white">{rule.threshold}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Channels: </span>
                      <span className="text-white">
                        {[
                          rule.email && 'Email',
                          rule.webhook && 'Webhook',
                          rule.sms && 'SMS',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    title={rule.enabled ? 'Disable' : 'Enable'}
                  >
                    {rule.enabled ? (
                      <PowerOff className="w-5 h-5" />
                    ) : (
                      <Power className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Form Modal - simplified placeholder */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create Alert Rule</h2>
            <p className="text-slate-400 mb-4">
              Alert rule creation form would go here with monitor selection, condition, threshold, and notification channels.
            </p>
            <button
              onClick={() => setShowCreateForm(false)}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
