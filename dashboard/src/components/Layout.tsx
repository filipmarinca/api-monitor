import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, AlertCircle, Bell, LogOut, Monitor } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuth';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', path: '/', icon: Monitor },
    { name: 'Incidents', path: '/incidents', icon: AlertCircle },
    { name: 'Alerts', path: '/alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-white">API Monitor</h1>
              <p className="text-xs text-slate-400">Real-time monitoring</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
