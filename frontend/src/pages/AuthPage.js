import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Key, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [accessKey, setAccessKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accessKey.trim()) return;
    setSubmitting(true);
    try {
      await login(accessKey);
      toast.success('Access granted');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid key');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(229,9,20,0.06) 0%, transparent 60%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-md p-6 md:p-8">
          <div className="text-center mb-5">
            <Shield className="w-9 h-9 text-primary mx-auto mb-2" />
            <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-white" data-testid="auth-title">
              SCHIRO
            </h1>
            <p className="text-primary font-bebas text-lg tracking-widest mt-1">COOKIE CHECKER</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            <div className="relative">
              <Key className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
              <Input
                data-testid="auth-key-input"
                type="password"
                placeholder="Enter access key"
                value={accessKey}
                onChange={e => setAccessKey(e.target.value)}
                required
                className="pl-10 bg-black/50 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50 text-white placeholder:text-white/30 rounded-sm h-12 font-mono"
              />
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={submitting || !accessKey.trim()}
              className="w-full h-12 bg-primary hover:bg-red-700 text-white font-bebas tracking-widest text-lg uppercase rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-[1.02] active:scale-95"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'ACCESS'
              )}
            </Button>
          </form>

          <p className="text-center text-white/20 text-xs mt-5">
            Access keys are provided by the administrator
          </p>
        </div>
      </motion.div>
    </div>
  );
}
