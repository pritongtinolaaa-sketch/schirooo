import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, ChevronDown, Calendar, Hash, CheckCircle, XCircle, AlertTriangle, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieResultCard from '@/components/CookieResultCard';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`, { headers });
      setChecks(res.data);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const deleteCheck = async (checkId) => {
    try {
      await axios.delete(`${API}/history/${checkId}`, { headers });
      setChecks(prev => prev.filter(c => c.id !== checkId));
      toast.success('Check deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleExpand = (id) => {
    setExpanded(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-10">
            <History className="w-7 h-7 text-primary" />
            <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-white" data-testid="history-title">
              CHECK <span className="text-primary">HISTORY</span>
            </h1>
          </div>
        </motion.div>

        {checks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <History className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-lg" data-testid="history-empty">No checks yet</p>
            <p className="text-white/15 text-sm mt-1">Your cookie check results will appear here</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {checks.map((check, idx) => (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                data-testid={`history-item-${idx}`}
                className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md overflow-hidden hover:border-white/15 transition-colors"
              >
                {/* Header Row */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(check.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Hash className="w-4 h-4" />
                      <span>{check.total} cookies</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" /> {check.valid_count}
                      </span>
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-3.5 h-3.5" /> {check.expired_count}
                      </span>
                      <span className="flex items-center gap-1 text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> {check.invalid_count}
                      </span>
                    </div>
                    {check.filename && (
                      <span className="text-white/20 text-xs font-mono">{check.filename}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(check.id)}
                      data-testid={`history-expand-${idx}`}
                      className="text-white/40 hover:text-white hover:bg-white/5"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded === check.id ? 'rotate-180' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCheck(check.id)}
                      data-testid={`history-delete-${idx}`}
                      className="text-white/20 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Results */}
                <AnimatePresence>
                  {expanded === check.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {check.results?.map((result, i) => (
                            <CookieResultCard key={i} result={result} index={i} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
