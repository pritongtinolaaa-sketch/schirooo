import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, History, LogOut, Shield, KeyRound, ScrollText, Gift, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user || location.pathname === '/auth') return null;

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, label, testId, activeClass, inactiveClass }) => (
    <Link
      to={to}
      data-testid={testId}
      onClick={() => setOpen(false)}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-sm text-sm transition-colors ${
        isActive(to) ? `text-white bg-white/10 ${activeClass || ''}` : `${inactiveClass || 'text-white/50 hover:text-white'} hover:bg-white/5`
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );

  return (
    <nav data-testid="navbar" className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo" onClick={() => setOpen(false)}>
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bebas text-xl tracking-wider text-white">SCHIRO</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" icon={LayoutDashboard} label="Dashboard" testId="nav-dashboard-link" />
          <NavLink to="/history" icon={History} label="History" testId="nav-history-link" />
          <NavLink to="/free-cookies" icon={Gift} label="Free Cookies" testId="nav-free-cookies-link" inactiveClass="text-green-400/70 hover:text-green-400" />
          {user?.is_master && (
            <>
              <NavLink to="/admin" icon={KeyRound} label="Keys" testId="nav-admin-link" inactiveClass="text-primary/70 hover:text-primary" />
              <NavLink to="/admin/logs" icon={ScrollText} label="Logs" testId="nav-logs-link" inactiveClass="text-green-400/70 hover:text-green-400" />
            </>
          )}
          <div className="w-px h-6 bg-white/10 mx-2" />
          <span className="text-sm text-white/40 mr-2" data-testid="nav-username">{user.label}</span>
          <button onClick={logout} data-testid="nav-logout-btn" className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl" data-testid="nav-mobile-menu">
          <div className="px-4 py-3 space-y-1">
            <NavLink to="/" icon={LayoutDashboard} label="Dashboard" testId="nav-dashboard-link-mobile" />
            <NavLink to="/history" icon={History} label="History" testId="nav-history-link-mobile" />
            <NavLink to="/free-cookies" icon={Gift} label="Free Cookies" testId="nav-free-cookies-link-mobile" inactiveClass="text-green-400/70 hover:text-green-400" />
            {user?.is_master && (
              <>
                <NavLink to="/admin" icon={KeyRound} label="Keys" testId="nav-admin-link-mobile" inactiveClass="text-primary/70 hover:text-primary" />
                <NavLink to="/admin/logs" icon={ScrollText} label="Logs" testId="nav-logs-link-mobile" inactiveClass="text-green-400/70 hover:text-green-400" />
              </>
            )}
            <div className="border-t border-white/5 pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm text-white/40" data-testid="nav-username-mobile">{user.label}</span>
              <button onClick={() => { logout(); setOpen(false); }} data-testid="nav-logout-btn-mobile" className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-red-400/60 hover:text-red-400 hover:bg-white/5 transition-colors">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
