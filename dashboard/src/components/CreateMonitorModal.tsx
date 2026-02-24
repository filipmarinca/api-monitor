import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { monitorsApi } from '../api/client';

interface CreateMonitorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMonitorModal({ onClose, onSuccess }: CreateMonitorModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    interval: 300000,
    timeout: 30000,
    expectedStatus: 200,
    validateSSL: true,
    regions: ['us-east'],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await monitorsApi.create(formData);
      toast.success('Monitor created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create monitor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Create Monitor</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Monitor Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My API"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.example.com/health"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Method
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expected Status
              </label>
              <input
                type="number"
                value={formData.expectedStatus}
                onChange={(e) =>
                  setFormData({ ...formData, expectedStatus: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Check Interval (ms)
              </label>
              <select
                value={formData.interval}
                onChange={(e) =>
                  setFormData({ ...formData, interval: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="60000">1 minute</option>
                <option value="300000">5 minutes</option>
                <option value="900000">15 minutes</option>
                <option value="1800000">30 minutes</option>
                <option value="3600000">1 hour</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={formData.timeout}
                onChange={(e) =>
                  setFormData({ ...formData, timeout: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="validateSSL"
              checked={formData.validateSSL}
              onChange={(e) =>
                setFormData({ ...formData, validateSSL: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
            />
            <label htmlFor="validateSSL" className="text-sm text-slate-300">
              Validate SSL certificate
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
