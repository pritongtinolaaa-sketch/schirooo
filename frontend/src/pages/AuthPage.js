import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Mail, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back');
      } else {
        await register(username, email, password);
        toast.success('Account created');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050505]">
      {/* Left Panel - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1606942257943-dd1859b3e380?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGRhcmslMjByZWQlMjBibGFjayUyMGRhdGElMjBuZXR3b3JrJTIwY2luZW1hdGljJTIwdGV4dHVyZXxlbnwwfHx8fDE3NzE4NDUxNTR8MA&ixlib=rb-4.1.0&q=85"
          alt="Abstract dark red"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505]" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex flex-col justify-end h-full p-12 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Shield className="w-12 h-12 text-primary mb-6" />
            <h2 className="font-bebas text-5xl tracking-wider text-white mb-4">
              NETFLIX COOKIE<br />
              <span className="text-primary">VALIDATOR</span>
            </h2>
            <p className="text-white/50 text-base max-w-sm leading-relaxed">
              Validate Netflix cookies instantly. Check account details, plans, profiles, and billing info.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md space-y-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-bebas text-3xl tracking-wider text-white">
              COOKIE<span className="text-primary">CHECK</span>
            </span>
          </div>

          <div>
            <h1 className="font-bebas text-4xl sm:text-5xl tracking-wider text-white" data-testid="auth-title">
              {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </h1>
            <p className="text-white/40 mt-2 text-sm">
              {isLogin ? 'Enter your credentials to continue' : 'Fill in the details to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="auth-form">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
                <Input
                  data-testid="auth-username-input"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required={!isLogin}
                  className="pl-10 bg-black/50 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50 text-white placeholder:text-white/30 rounded-sm h-12"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
              <Input
                data-testid="auth-email-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="pl-10 bg-black/50 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50 text-white placeholder:text-white/30 rounded-sm h-12"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
              <Input
                data-testid="auth-password-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pl-10 bg-black/50 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50 text-white placeholder:text-white/30 rounded-sm h-12"
              />
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={submitting}
              className="w-full h-12 bg-primary hover:bg-red-700 text-white font-bebas tracking-widest text-lg uppercase rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-[1.02] active:scale-95"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'
              )}
            </Button>
          </form>

          <p className="text-center text-white/40 text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => { setIsLogin(!isLogin); setUsername(''); setEmail(''); setPassword(''); }}
              data-testid="auth-toggle-btn"
              className="text-primary ml-2 hover:underline font-medium"
            >
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
