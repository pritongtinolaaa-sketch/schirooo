import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Terminal, Zap, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const handleCheckPaste = async () => {
    if (!cookieText.trim()) {
      toast.error('Paste some cookies first');
      return;
    }
    setChecking(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/check`, {
        cookies_text: cookieText,
        format_type: formatType,
      }, { headers });
      setResults(res.data);
      toast.success(`Checked ${res.data.total} cookie(s)`);
      setCookieText('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckFile = async () => {
    if (!selectedFile) {
      toast.error('Select a file first');
      return;
    }
    setChecking(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await axios.post(`${API}/check/file`, formData, { headers });
      setResults(res.data);
      toast.success(`Checked ${res.data.total} cookie(s) from file`);
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check failed');
    } finally {
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
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Hero / Red glow background */}
      <div
        className="relative"
        style={{
          background: 'radial-gradient(ellipse at top center, rgba(229,9,20,0.08) 0%, transparent 60%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
          {/* Title */}
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

          {/* Input Area */}
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
                  {selectedFile ? (
                    <div>
                      <p className="text-white font-medium" data-testid="selected-filename">{selectedFile.name}</p>
                      <p className="text-white/30 text-sm mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-primary text-sm mt-3 hover:underline"
                        data-testid="remove-file-btn"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white/40 mb-1">Drag & drop your cookie file here</p>
                      <p className="text-white/20 text-sm mb-4">Supports .txt and .json files</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.json"
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
                    disabled={checking || !selectedFile}
                    data-testid="check-file-btn"
                    className="bg-primary hover:bg-red-700 text-white font-bebas tracking-widest text-base uppercase rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105 active:scale-95 px-8 h-11"
                  >
                    {checking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        CHECK FILE
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-10"
              >
                {/* Summary Bar */}
                <div
                  className="flex items-center gap-6 mb-6 pb-6 border-b border-white/5"
                  data-testid="results-summary"
                >
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

                {/* Valid Cookies Section */}
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
                          transition={{ duration: 0.4, delay: i * 0.1 }}
                        >
                          <CookieResultCard result={result} index={i} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expired Cookies Section */}
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
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                          <CookieResultCard result={result} index={i} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalid Cookies Section */}
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
                          transition={{ duration: 0.4, delay: i * 0.05 }}
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

          {/* Footer Note */}
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
