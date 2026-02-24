import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Terminal, Zap, CheckCircle, XCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieResultCard from '@/components/CookieResultCard';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { token } = useAuth();
  const [cookieText, setCookieText] = useState('');
  const [formatType, setFormatType] = useState('auto');
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback((jobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/check/${jobId}/status`, { headers });
        const data = res.data;
        setProgress({
          total: data.total,
          checked: data.checked_count,
          valid: data.valid_count,
          expired: data.expired_count,
          invalid: data.invalid_count,
        });
        if (data.status === 'done') {
          stopPolling();
          setResults(data);
          setProgress(null);
          setChecking(false);
          toast.success(`Done! ${data.valid_count} valid, ${data.expired_count} expired, ${data.invalid_count} invalid out of ${data.total}`);
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);
  }, [headers, stopPolling]); // eslint-disable-line

  const handleCheckPaste = async () => {
    if (!cookieText.trim()) {
      toast.error('Paste some cookies first');
      return;
    }
    setChecking(true);
    setResults(null);
    setProgress(null);
    try {
      const res = await axios.post(`${API}/check`, {
        cookies_text: cookieText,
        format_type: formatType,
      }, { headers });
      const data = res.data;
      setProgress({ total: data.total, checked: 0, valid: 0, expired: 0, invalid: 0 });
      startPolling(data.id);
      setCookieText('');
      toast.success(`Processing ${data.total} cookie(s)...`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check failed');
      setChecking(false);
    }
  };

  const handleCheckFile = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Select at least one file first');
      return;
    }
    setChecking(true);
    setResults(null);
    setProgress(null);
    try {
      const formData = new FormData();
      let res;
      if (selectedFiles.length === 1) {
        formData.append('file', selectedFiles[0]);
        res = await axios.post(`${API}/check/file`, formData, { headers });
      } else {
        selectedFiles.forEach(f => formData.append('files', f));
        res = await axios.post(`${API}/check/files`, formData, { headers });
      }
      const data = res.data;
      setProgress({ total: data.total, checked: 0, valid: 0, expired: 0, invalid: 0 });
      startPolling(data.id);
      setSelectedFiles([]);
      toast.success(`Processing ${data.total} cookie(s)...`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check failed');
      setChecking(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} file(s) added`);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} file(s) selected`);
    }
    e.target.value = '';
  };

  const handleExportResults = () => {
    if (!results) return;
    const validResults = results.results.filter(r => r.status === 'valid');
    if (validResults.length === 0) {
      toast.error('No valid cookies to export');
      return;
    }
    const separator = '\n=============================================================\n';
    const content = validResults.map(r => {
      const lines = [];
      if (r.email) lines.push(`Email: ${r.email}`);
      if (r.plan) lines.push(`Plan: ${r.plan}`);
      lines.push('');
      lines.push(r.full_cookie || '');
      return lines.join('\n');
    }).join(separator);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valid_cookies.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${validResults.length} valid cookie(s)`);
  };

  const progressPercent = progress ? Math.round((progress.checked / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050505]">
      <div
        className="relative"
        style={{
          background: 'radial-gradient(ellipse at top center, rgba(229,9,20,0.08) 0%, transparent 60%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <h1 className="font-bebas text-4xl sm:text-5xl lg:text-6xl tracking-wider text-white" data-testid="dashboard-title">
              COOKIE <span className="text-primary">CHECKER</span>
            </h1>
            <p className="text-white/40 mt-2 text-sm md:text-base max-w-lg">
              Paste or upload Netflix cookies to validate accounts and extract details.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md overflow-hidden"
          >
            <Tabs defaultValue="paste" className="w-full">
              <div className="flex items-center justify-between px-4 pt-4 pb-0">
                <TabsList className="bg-black/50 border border-white/5" data-testid="input-tabs">
                  <TabsTrigger
                    value="paste"
                    data-testid="tab-paste"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-white text-white/50 gap-2"
                  >
                    <Terminal className="w-4 h-4" />
                    Paste Cookie
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    data-testid="tab-upload"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-white text-white/50 gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <Select value={formatType} onValueChange={setFormatType}>
                  <SelectTrigger
                    className="w-40 bg-black/50 border-white/10 text-white/70 h-9"
                    data-testid="format-select"
                  >
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10">
                    <SelectItem value="auto">Auto Detect</SelectItem>
                    <SelectItem value="netscape">Netscape</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="paste" className="px-4 pb-4 mt-3">
                <textarea
                  data-testid="cookie-textarea"
                  value={cookieText}
                  onChange={(e) => setCookieText(e.target.value)}
                  placeholder={`Paste Netflix cookies here...\n\nSupported formats:\n- Netscape (tab-separated)\n- JSON array [{name, value, ...}]\n- key=value; pairs\n\nSeparate multiple cookies with 3+ empty lines or ===== dividers`}
                  className="w-full h-64 bg-black/80 border border-white/10 rounded font-mono text-sm text-green-400 p-4 resize-none focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none placeholder:text-white/20 transition-colors"
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-white/20 font-mono">
                    {cookieText.length > 0 ? `${cookieText.length} chars` : ''}
                  </span>
                  <Button
                    onClick={handleCheckPaste}
                    disabled={checking || !cookieText.trim()}
                    data-testid="check-paste-btn"
                    className="bg-primary hover:bg-red-700 text-white font-bebas tracking-widest text-base uppercase rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105 active:scale-95 px-8 h-11"
                  >
                    {checking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        CHECK COOKIES
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="px-4 pb-4 mt-3">
                <div
                  data-testid="file-dropzone"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-md p-12 text-center transition-all ${
                    dragActive
                      ? 'border-primary bg-primary/5 shadow-[0_0_30px_rgba(229,9,20,0.2)]'
                      : 'border-white/15 hover:border-white/25'
                  }`}
                >
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-white/20'}`} />
                  {selectedFiles.length > 0 ? (
                    <div>
                      <p className="text-white font-medium" data-testid="selected-filename">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-center gap-2 text-sm text-white/50">
                            <span className="font-mono truncate max-w-[200px]">{f.name}</span>
                            <span className="text-white/20">({(f.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-300 text-xs"
                              data-testid={`remove-file-${i}`}
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-primary text-sm mt-3 hover:underline"
                        data-testid="remove-all-files-btn"
                      >
                        Remove all files
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white/40 mb-1">Drag & drop your cookie files here</p>
                      <p className="text-white/20 text-sm mb-4">Supports .txt and .json files — select multiple at once</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.json"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="file-input"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="browse-files-btn"
                        className="bg-transparent border-white/20 hover:border-white text-white font-bebas tracking-widest uppercase rounded-sm hover:bg-white/5"
                      >
                        BROWSE FILES
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handleCheckFile}
                    disabled={checking || selectedFiles.length === 0}
                    data-testid="check-file-btn"
                    className="bg-primary hover:bg-red-700 text-white font-bebas tracking-widest text-base uppercase rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105 active:scale-95 px-8 h-11"
                  >
                    {checking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        CHECK {selectedFiles.length > 1 ? `${selectedFiles.length} FILES` : 'FILE'}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Live Progress Bar */}
          <AnimatePresence>
            {checking && progress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 bg-black/60 backdrop-blur-md border border-white/10 rounded-md p-6"
                data-testid="progress-section"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="font-bebas text-lg tracking-wider text-white">
                      CHECKING COOKIES
                    </span>
                  </div>
                  <span className="font-mono text-sm text-white/60">
                    {progress.checked} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center gap-5 mt-3 text-xs">
                  <span className="text-green-400">{progress.valid} Valid</span>
                  <span className="text-red-400">{progress.expired} Expired</span>
                  <span className="text-yellow-400">{progress.invalid} Invalid</span>
                  <span className="text-white/30 ml-auto">{progressPercent}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {results && !checking && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-10"
              >
                <div
                  className="flex items-center justify-between gap-6 mb-6 pb-6 border-b border-white/5"
                  data-testid="results-summary"
                >
                  <div className="flex items-center gap-6">
                    <h2 className="font-bebas text-2xl tracking-wider text-white">RESULTS</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-white/60">
                        Total: <strong className="text-white">{results.total}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {results.valid_count} Valid
                      </span>
                      <span className="flex items-center gap-1.5 text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                        {results.expired_count} Expired
                      </span>
                      <span className="flex items-center gap-1.5 text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {results.invalid_count} Invalid
                      </span>
                    </div>
                  </div>
                  {results.valid_count > 0 && (
                    <Button
                      onClick={handleExportResults}
                      data-testid="export-results-btn"
                      variant="outline"
                      className="bg-transparent border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 font-bebas tracking-widest uppercase rounded-sm text-sm gap-2"
                    >
                      <Download className="w-4 h-4" />
                      EXPORT VALID
                    </Button>
                  )}
                </div>

                {results.results.filter(r => r.status === 'valid').length > 0 && (
                  <div className="mb-8" data-testid="valid-section">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                      <h3 className="font-bebas text-xl tracking-wider text-green-400">VALID COOKIES</h3>
                      <span className="text-xs text-green-400/50 font-mono">({results.results.filter(r => r.status === 'valid').length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {results.results.map((result, i) => result.status === 'valid' && (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.05, 1) }}
                        >
                          <CookieResultCard result={result} index={i} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {results.results.filter(r => r.status === 'expired').length > 0 && (
                  <div className="mb-8" data-testid="expired-section">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                      <h3 className="font-bebas text-xl tracking-wider text-red-400">EXPIRED COOKIES</h3>
                      <span className="text-xs text-red-400/50 font-mono">({results.results.filter(r => r.status === 'expired').length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {results.results.map((result, i) => result.status === 'expired' && (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.05, 1) }}
                        >
                          <CookieResultCard result={result} index={i} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {results.results.filter(r => r.status === 'invalid').length > 0 && (
                  <div className="mb-8" data-testid="invalid-section">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                      <h3 className="font-bebas text-xl tracking-wider text-yellow-400">INVALID COOKIES</h3>
                      <span className="text-xs text-yellow-400/50 font-mono">({results.results.filter(r => r.status === 'invalid').length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {results.results.map((result, i) => result.status === 'invalid' && (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.05, 1) }}
                        >
                          <CookieResultCard result={result} index={i} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-16 pb-8 text-center" data-testid="footer-note">
            <p className="text-white/20 text-xs tracking-widest uppercase font-mono">
              Created by Schiro. Not for Sale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
