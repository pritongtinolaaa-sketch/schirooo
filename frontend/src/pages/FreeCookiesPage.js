import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Gift, Trash2, Copy, Check, Loader2, Mail, CreditCard, Globe, Calendar,
  Clock, Users, Key, ChevronDown, AlertCircle, Link2, Settings, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function CopyBtn({ text, testId }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} data-testid={testId} className="p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/20">{icon}</span>
      <span className="text-white/40 text-xs uppercase tracking-wide w-24 shrink-0">{label}</span>
      <span className="text-white/90 text-sm font-medium truncate">{value}</span>
    </div>
  );
}

function FreeCookieCard({ cookie, index, isAdmin, onDelete }) {
  const [cookieOpen, setCookieOpen] = useState(false);
  const [browserCookieOpen, setBrowserCookieOpen] = useState(false);

  return (
    <div
      data-testid={`free-cookie-card-${index}`}
      className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md overflow-hidden hover:border-green-500/20 transition-colors"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
          <span className="font-mono text-xs text-white/30">FREE COOKIE #{index + 1}</span>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-mono">VALID</Badge>
          {cookie.last_refreshed && (
            <span className="text-[10px] text-white/15 font-mono flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              {new Date(cookie.last_refreshed).toLocaleTimeString()}
            </span>
          )}
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(cookie.id)}
            className="text-white/15 hover:text-red-400 hover:bg-red-500/10"
            data-testid={`delete-free-cookie-${index}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={cookie.email} />
        <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Plan" value={cookie.plan} />
        <InfoRow icon={<Globe className="w-4 h-4" />} label="Country" value={cookie.country} />
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Since" value={cookie.member_since} />
        <InfoRow icon={<Clock className="w-4 h-4" />} label="Next Bill" value={cookie.next_billing} />
        {cookie.profiles && cookie.profiles.length > 0 && (
          <InfoRow icon={<Users className="w-4 h-4" />} label="Profiles" value={cookie.profiles.join(', ')} />
        )}
      </div>

      {/* NFToken */}
      {cookie.nftoken && (
        <div className="px-5 py-3 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary/60" />
            <span className="text-xs text-white/40 uppercase tracking-wide">NFToken</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-primary/80 bg-black/40 px-3 py-2 rounded truncate" data-testid={`free-nftoken-${index}`}>
              {cookie.nftoken}
            </code>
            <CopyBtn text={cookie.nftoken} testId={`free-nftoken-copy-${index}`} />
          </div>
          {cookie.nftoken_link && (
            <a
              href={cookie.nftoken_link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`free-nftoken-link-${index}`}
              className="flex items-center gap-1.5 text-xs text-primary/60 hover:text-primary transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Open Netflix with token
            </a>
          )}
        </div>
      )}

      {/* Browser Cookies - Admin only */}
      {isAdmin && cookie.browser_cookies && (
        <Collapsible open={browserCookieOpen} onOpenChange={setBrowserCookieOpen}>
          <div className="border-t border-white/5">
            <CollapsibleTrigger
              className="w-full px-5 py-3 flex items-center justify-between text-xs text-green-400/50 hover:text-green-400/80 transition-colors"
              data-testid={`free-browser-cookies-expand-${index}`}
            >
              <span className="font-mono uppercase tracking-wide">
                {browserCookieOpen ? 'Hide' : 'View'} Browser Cookies
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${browserCookieOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative px-5 pb-4">
                <pre className="text-xs font-mono text-green-400/60 bg-black/60 rounded p-4 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                  {cookie.browser_cookies}
                </pre>
                <div className="absolute top-2 right-7">
                  <CopyBtn text={cookie.browser_cookies} testId={`free-browser-cookies-copy-${index}`} />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Full Cookie - Admin only */}
      {isAdmin && cookie.full_cookie && (
        <Collapsible open={cookieOpen} onOpenChange={setCookieOpen}>
          <div className="border-t border-white/5">
            <CollapsibleTrigger
              className="w-full px-5 py-3 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors"
              data-testid={`free-cookie-expand-${index}`}
            >
              <span className="font-mono uppercase tracking-wide">
                {cookieOpen ? 'Hide' : 'View'} Original Cookie
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${cookieOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative px-5 pb-4">
                <pre className="text-xs font-mono text-white/40 bg-black/60 rounded p-4 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                  {cookie.full_cookie}
                </pre>
                <div className="absolute top-2 right-7">
                  <CopyBtn text={cookie.full_cookie} testId={`free-cookie-copy-${index}`} />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}

export default function FreeCookiesPage() {
  const { user, token } = useAuth();
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [limitInput, setLimitInput] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const isAdmin = user?.is_master;

  useEffect(() => {
    if (isAdmin) {
      fetchAdminCookies();
    } else {
      fetchUserCookies();
    }
  }, [isAdmin]); // eslint-disable-line

  const fetchAdminCookies = async () => {
    try {
      const res = await axios.get(`${API}/admin/free-cookies`, { headers });
      setCookies(res.data.cookies);
      setDisplayLimit(res.data.display_limit);
      setLimitInput(String(res.data.display_limit));
    } catch {
      toast.error('Failed to load free cookies');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCookies = async () => {
    try {
      const res = await axios.get(`${API}/free-cookies`, { headers });
      setCookies(res.data);
    } catch {
      toast.error('Failed to load free cookies');
    } finally {
      setLoading(false);
    }
  };

  const deleteCookie = async (cookieId) => {
    try {
      await axios.delete(`${API}/admin/free-cookies/${cookieId}`, { headers });
      setCookies(prev => prev.filter(c => c.id !== cookieId));
      toast.success('Free cookie removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const updateLimit = async () => {
    const val = parseInt(limitInput);
    if (!val || val < 1) { toast.error('Enter a valid number'); return; }
    setSavingLimit(true);
    try {
      await axios.patch(`${API}/admin/free-cookies/limit`, { limit: val }, { headers });
      setDisplayLimit(val);
      toast.success(`Display limit set to ${val}`);
    } catch {
      toast.error('Failed to update limit');
    } finally {
      setSavingLimit(false);
    }
  };

  const refreshTokens = async () => {
    setRefreshing(true);
    try {
      const res = await axios.post(`${API}/admin/free-cookies/refresh`, {}, { headers });
      toast.success(res.data.message);
      fetchAdminCookies();
    } catch {
      toast.error('Failed to refresh tokens');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-10">
            <Gift className="w-7 h-7 text-green-400" />
            <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-white" data-testid="free-cookies-title">
              FREE <span className="text-green-400">COOKIES</span>
            </h1>
          </div>
        </motion.div>

        {/* Admin Controls */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md p-6 mb-8"
            data-testid="free-cookies-admin-controls"
          >
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-4 h-4 text-white/40" />
              <h2 className="font-bebas text-lg tracking-wider text-white">DISPLAY SETTINGS</h2>
            </div>
            <div className="flex items-end gap-4">
              <div className="w-48">
                <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Max cookies shown to users</label>
                <Input
                  type="number"
                  min={1}
                  value={limitInput}
                  onChange={e => setLimitInput(e.target.value)}
                  className="bg-black/50 border-white/10 focus:border-primary text-white h-10"
                  data-testid="free-cookies-limit-input"
                />
              </div>
              <Button
                onClick={updateLimit}
                disabled={savingLimit}
                data-testid="save-limit-btn"
                className="bg-primary hover:bg-red-700 text-white font-bebas tracking-widest uppercase rounded-sm h-10 px-6"
              >
                {savingLimit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE'}
              </Button>
              <div className="ml-auto">
                <Badge className="bg-white/5 text-white/40 border border-white/10 text-xs">
                  {cookies.length} total / {displayLimit} shown to users
                </Badge>
              </div>
            </div>
            <p className="text-xs text-white/20 mt-3">
              Add free cookies by checking them on the Dashboard first, then clicking "Add to Free Cookies" on valid results.
              Tokens auto-refresh every 45 minutes.
            </p>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4">
              <Button
                onClick={refreshTokens}
                disabled={refreshing || cookies.length === 0}
                data-testid="refresh-tokens-btn"
                className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 font-bebas tracking-widest uppercase rounded-sm h-10 px-6"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                REFRESH TOKENS NOW
              </Button>
              <span className="text-xs text-white/20">Force-refresh all NFTokens immediately</span>
            </div>
          </motion.div>
        )}

        {/* Cookies List */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </div>
        ) : cookies.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Gift className="w-12 h-12 mx-auto mb-3 text-white/10" />
            <p>No free cookies available</p>
            {!isAdmin && (
              <p className="text-xs text-white/15 mt-1">Check back later — the admin will add some!</p>
            )}
            {isAdmin && (
              <p className="text-xs text-white/15 mt-1">Check cookies on the Dashboard, then add valid ones here.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence>
              {cookies.map((cookie, idx) => (
                <motion.div
                  key={cookie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <FreeCookieCard
                    cookie={cookie}
                    index={idx}
                    isAdmin={isAdmin}
                    onDelete={deleteCookie}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
