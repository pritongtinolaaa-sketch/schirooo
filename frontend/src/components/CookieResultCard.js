import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mail, CreditCard, Calendar, Globe, Clock, Users, ChevronDown, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

export default function CookieResultCard({ result, index }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const config = statusConfig[result.status] || statusConfig.invalid;

  const copyFullCookie = () => {
    navigator.clipboard.writeText(result.full_cookie || '');
    setCopied(true);
    toast.success('Cookie copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const hasInfo = result.email || result.plan || result.member_since || result.country || result.next_billing || (result.profiles && result.profiles.length > 0);

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
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Since" value={result.member_since} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Country" value={result.country} />
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

      {/* Full Cookie - Collapsible */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="border-t border-white/5">
          <CollapsibleTrigger
            className="w-full px-5 py-3 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors"
            data-testid={`cookie-expand-${index}`}
          >
            <span className="font-mono uppercase tracking-wide">
              {open ? 'Hide' : 'View'} Full Cookie
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="relative px-5 pb-4">
              <pre className="text-xs font-mono text-green-400/60 bg-black/60 rounded p-4 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                {result.full_cookie}
              </pre>
              <button
                onClick={copyFullCookie}
                data-testid={`cookie-copy-${index}`}
                className="absolute top-2 right-7 p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-white/40" />
                )}
              </button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
