import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mail, CreditCard, Calendar, Globe, Clock, Users, ChevronDown, Copy, Check, AlertCircle, Link2, Key, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  valid: {
    badge: 'bg-green-500/20 text-green-400 border border-green-500/30',
    glow: 'hover:border-green-500/30',
    dot: 'bg-green-400',
  },
  expired: {
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    glow: 'hover:border-red-500/30',
    dot: 'bg-red-400',
  },
  invalid: {
    badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    glow: 'hover:border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
};

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

function CopyButton({ text, testId }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
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
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button onClick={handleCopy} data-testid={testId} className="p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

export default function CookieResultCard({ result, index }) {
  const { user, token } = useAuth();
  const [cookieOpen, setCookieOpen] = useState(false);
  const [browserCookieOpen, setBrowserCookieOpen] = useState(false);
  const [addingFree, setAddingFree] = useState(false);
  const [addedFree, setAddedFree] = useState(false);

  const config = statusConfig[result.status] || statusConfig.invalid;

  const hasInfo = result.email || result.plan || result.member_since || result.country || result.next_billing || (result.profiles && result.profiles.length > 0);

  const handleAddToFree = async () => {
    setAddingFree(true);
    try {
      await axios.post(`${API}/admin/free-cookies`, {
        email: result.email,
        plan: result.plan,
        country: result.country,
        member_since: result.member_since,
        next_billing: result.next_billing,
        profiles: result.profiles || [],
        browser_cookies: result.browser_cookies || '',
        full_cookie: result.full_cookie || '',
        nftoken: result.nftoken,
        nftoken_link: result.nftoken_link,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAddedFree(true);
      toast.success('Added to Free Cookies');
    } catch {
      toast.error('Failed to add to Free Cookies');
    } finally {
      setAddingFree(false);
    }
  };

  return (
    <div
      data-testid={`cookie-result-card-${index}`}
      className={`bg-black/60 backdrop-blur-md border border-white/10 rounded-md overflow-hidden transition-all duration-300 ${config.glow}`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className="font-mono text-xs text-white/30">COOKIE #{index + 1}</span>
        </div>
        <Badge className={`${config.badge} text-xs font-mono uppercase`} data-testid={`cookie-status-${index}`}>
          {result.status}
        </Badge>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {hasInfo ? (
          <>
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={result.email} />
            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Plan" value={result.plan} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Country" value={result.country} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Since" value={result.member_since} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Next Bill" value={result.next_billing} />
            {result.profiles && result.profiles.length > 0 && (
              <InfoRow icon={<Users className="w-4 h-4" />} label="Profiles" value={result.profiles.join(', ')} />
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-white/30 text-sm py-2">
            <AlertCircle className="w-4 h-4" />
            <span>{result.error || 'No account details found'}</span>
          </div>
        )}
      </div>

      {/* NFToken Section */}
      {result.nftoken && (
        <div className="px-5 py-3 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary/60" />
            <span className="text-xs text-white/40 uppercase tracking-wide">NFToken</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-primary/80 bg-black/40 px-3 py-2 rounded truncate" data-testid={`nftoken-value-${index}`}>
              {result.nftoken}
            </code>
            <CopyButton text={result.nftoken} testId={`nftoken-copy-${index}`} />
          </div>
          {result.nftoken_link && (
            <a
              href={result.nftoken_link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`nftoken-link-${index}`}
              className="flex items-center gap-1.5 text-xs text-primary/60 hover:text-primary transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Open Netflix with token
            </a>
          )}
        </div>
      )}

      {/* Browser Cookies - Collapsible */}
      {result.browser_cookies && (
        <Collapsible open={browserCookieOpen} onOpenChange={setBrowserCookieOpen}>
          <div className="border-t border-white/5">
            <CollapsibleTrigger
              className="w-full px-5 py-3 flex items-center justify-between text-xs text-green-400/50 hover:text-green-400/80 transition-colors"
              data-testid={`browser-cookies-expand-${index}`}
            >
              <span className="font-mono uppercase tracking-wide">
                {browserCookieOpen ? 'Hide' : 'View'} Browser Cookies
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${browserCookieOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative px-5 pb-4">
                <pre className="text-xs font-mono text-green-400/60 bg-black/60 rounded p-4 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                  {result.browser_cookies}
                </pre>
                <div className="absolute top-2 right-7">
                  <CopyButton text={result.browser_cookies} testId={`browser-cookies-copy-${index}`} />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Full Cookie (original input) - Collapsible */}
      <Collapsible open={cookieOpen} onOpenChange={setCookieOpen}>
        <div className="border-t border-white/5">
          <CollapsibleTrigger
            className="w-full px-5 py-3 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors"
            data-testid={`cookie-expand-${index}`}
          >
            <span className="font-mono uppercase tracking-wide">
              {cookieOpen ? 'Hide' : 'View'} Original Cookie
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${cookieOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="relative px-5 pb-4">
              <pre className="text-xs font-mono text-white/40 bg-black/60 rounded p-4 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                {result.full_cookie}
              </pre>
              <div className="absolute top-2 right-7">
                <CopyButton text={result.full_cookie || ''} testId={`cookie-copy-${index}`} />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
