import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/client';
import { useAuthStore } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@apimonitor.dev');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      login(response.data.token, response.data.user);
      toast.success('Login successful');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">API Monitor</h1>
          </div>
          <p className="text-slate-400">
            Real-time API monitoring and analytics platform
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="demo@apimonitor.dev"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="demo123"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-sm text-slate-400 text-center">
              Demo credentials are pre-filled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
