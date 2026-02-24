import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Eye, EyeOff, Users, Monitor, Copy, X, Loader2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newMaxDevices, setNewMaxDevices] = useState(1);
  const [customKey, setCustomKey] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [newKeyValue, setNewKeyValue] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user?.is_master) {
      navigate('/');
      return;
    }
    fetchKeys();
  }, [user, navigate]); // eslint-disable-line

  const fetchKeys = async () => {
    try {
      const res = await axios.get(`${API}/admin/keys`, { headers });
      setKeys(res.data);
    } catch {
      toast.error('Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!newLabel.trim()) { toast.error('Enter a label'); return; }
    setCreating(true);
    try {
      const res = await axios.post(`${API}/admin/keys`, {
        label: newLabel,
        max_devices: newMaxDevices,
        custom_key: customKey.trim() || undefined
      }, { headers });
      setNewKeyValue(res.data.key_value);
      setNewLabel('');
      setNewMaxDevices(1);
      setCustomKey('');
      fetchKeys();
      toast.success('Key created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (keyId) => {
    try {
      await axios.delete(`${API}/admin/keys/${keyId}`, { headers });
      setKeys(prev => prev.filter(k => k.id !== keyId));
      toast.success('Key deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const revealKey = async (keyId) => {
    try {
      const res = await axios.get(`${API}/admin/keys/${keyId}/reveal`, { headers });
      setRevealedKeys(prev => ({ ...prev, [keyId]: res.data.key_value }));
    } catch {
      toast.error('Failed to reveal key');
    }
  };

  const revokeSession = async (keyId, sessionId) => {
    try {
      await axios.delete(`${API}/admin/keys/${keyId}/sessions/${sessionId}`, { headers });
      fetchKeys();
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  if (!user?.is_master) return null;

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-10">
            <KeyRound className="w-7 h-7 text-primary" />
            <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-white" data-testid="admin-title">
              KEY <span className="text-primary">MANAGEMENT</span>
            </h1>
          </div>
        </motion.div>

        {/* New Key Alert */}
        <AnimatePresence>
          {newKeyValue && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 bg-green-500/10 border border-green-500/30 rounded-md p-5"
              data-testid="new-key-alert"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-medium mb-1">New Key Created</p>
                  <p className="text-white/50 text-sm mb-3">Copy this key now. It won't be shown in full again.</p>
                  <code className="font-mono text-green-400 bg-black/40 px-3 py-1.5 rounded text-sm" data-testid="new-key-value">
                    {newKeyValue}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => copyText(newKeyValue)} className="text-green-400 hover:bg-green-500/10" data-testid="copy-new-key-btn">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewKeyValue(null)} className="text-white/40 hover:text-white" data-testid="dismiss-new-key-btn">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Key Form */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md p-6 mb-8" data-testid="create-key-form">
          <h2 className="font-bebas text-xl tracking-wider text-white mb-4">CREATE NEW KEY</h2>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Label</label>
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. John's Key"
                className="bg-black/50 border-white/10 focus:border-primary text-white placeholder:text-white/30 h-11"
                data-testid="create-key-label"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Custom Key <span className="text-white/20">(optional)</span></label>
              <Input
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                placeholder="Leave blank for random key"
                className="bg-black/50 border-white/10 focus:border-primary text-white placeholder:text-white/20 h-11 font-mono text-sm"
                data-testid="create-key-custom"
              />
            </div>
            <div className="w-32">
              <label className="text-xs text-white/40 uppercase tracking-wide mb-1.5 block">Max Devices</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newMaxDevices}
                onChange={e => setNewMaxDevices(parseInt(e.target.value) || 1)}
                className="bg-black/50 border-white/10 focus:border-primary text-white h-11"
                data-testid="create-key-devices"
              />
            </div>
            <Button
              onClick={createKey}
              disabled={creating}
              data-testid="create-key-btn"
              className="bg-primary hover:bg-red-700 text-white font-bebas tracking-widest uppercase rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105 active:scale-95 h-11 px-6"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />CREATE</>}
            </Button>
          </div>
        </div>

        {/* Keys List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <Key className="w-12 h-12 mx-auto mb-3 text-white/10" />
              <p>No keys found</p>
            </div>
          ) : (
            keys.map((keyItem, idx) => (
              <motion.div
                key={keyItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                data-testid={`key-card-${idx}`}
                className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md overflow-hidden hover:border-white/15 transition-colors"
              >
                <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{keyItem.label}</span>
                      {keyItem.is_master && (
                        <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">MASTER</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="font-mono text-white/30">{keyItem.key_preview}</span>
                      <span className="flex items-center gap-1 text-white/30">
                        <Monitor className="w-3.5 h-3.5" />
                        {keyItem.session_count}/{keyItem.max_devices} devices
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {revealedKeys[keyItem.id] ? (
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-green-400 bg-black/60 px-2 py-1 rounded max-w-[200px] truncate">
                          {revealedKeys[keyItem.id]}
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => copyText(revealedKeys[keyItem.id])} className="text-white/30 hover:text-white" data-testid={`copy-key-${idx}`}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRevealedKeys(prev => { const n = { ...prev }; delete n[keyItem.id]; return n; })} className="text-white/30 hover:text-white">
                          <EyeOff className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => revealKey(keyItem.id)} className="text-white/30 hover:text-white" data-testid={`reveal-key-${idx}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedSessions(expandedSessions === keyItem.id ? null : keyItem.id)}
                      className="text-white/30 hover:text-white"
                      data-testid={`sessions-key-${idx}`}
                    >
                      <Users className="w-3.5 h-3.5" />
                    </Button>
                    {!keyItem.is_master && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteKey(keyItem.id)}
                        className="text-white/20 hover:text-red-400 hover:bg-red-500/10"
                        data-testid={`delete-key-${idx}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sessions Panel */}
                <AnimatePresence>
                  {expandedSessions === keyItem.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pt-2 border-t border-white/5">
                        <p className="text-xs text-white/30 uppercase tracking-wide mb-3">Active Sessions</p>
                        {keyItem.active_sessions?.length > 0 ? (
                          <div className="space-y-2">
                            {keyItem.active_sessions.map((session, si) => (
                              <div key={session.session_id} className="flex items-center justify-between bg-black/40 rounded px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-green-400" />
                                  <span className="font-mono text-xs text-white/40">{session.session_id.slice(0, 8)}...</span>
                                  <span className="text-xs text-white/20">{new Date(session.created_at).toLocaleDateString()}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => revokeSession(keyItem.id, session.session_id)}
                                  className="h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs"
                                  data-testid={`revoke-session-${si}`}
                                >
                                  Revoke
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/20">No active sessions</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
