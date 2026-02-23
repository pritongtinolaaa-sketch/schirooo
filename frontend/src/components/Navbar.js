import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, History, LogOut, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/auth') return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      data-testid="navbar"
      className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bebas text-2xl tracking-wider text-white">
            COOKIE<span className="text-primary">CHECK</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/"
            data-testid="nav-dashboard-link"
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-colors ${
              isActive('/') ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/history"
            data-testid="nav-history-link"
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-colors ${
              isActive('/history') ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </Link>

          <div className="w-px h-6 bg-white/10 mx-3" />

          <span className="text-sm text-white/40 mr-3" data-testid="nav-username">
            {user.username}
          </span>
          <button
            onClick={logout}
            data-testid="nav-logout-btn"
            className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
