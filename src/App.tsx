import { useState, useEffect, useRef } from "react";
import { Search, Send, User, CheckCircle2, Loader2, Play, Instagram, Terminal, Package, Key, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IGUser {
  pk: string;
  username: string;
  profile_pic_url: string;
  full_name: string;
}

interface BotSession {
  userId: string;
  username: string;
  state: 'idle' | 'sent_initial' | 'sent_ask_test' | 'generating' | 'completed' | 'failed';
  threadId: string | null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'client' | 'admin'>('client');
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IGUser[]>([]);
  const [activeSession, setActiveSession] = useState<BotSession | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [adminJson, setAdminJson] = useState("");
  const [isAdminUpdating, setIsAdminUpdating] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const updateIGSession = async () => {
    if (!adminJson) return;
    setIsAdminUpdating(true);
    try {
      // Tentar extrair cookies e payload do texto colado
      // O usuário pode colar vários blocos JSON
      const jsonBlocks = adminJson.match(/\{[\s\S]*?\}/g);
      if (!jsonBlocks) throw new Error("JSON Inválido");

      let cookies = {};
      let payload = {};

      jsonBlocks.forEach(block => {
        try {
          const parsed = JSON.parse(block);
          if (parsed.sessionid || parsed.csrftoken || parsed.ds_user_id) {
            cookies = { ...cookies, ...parsed };
          } else if (parsed.av || parsed.__d || parsed.fb_dtsg) {
            payload = { ...payload, ...parsed };
          }
        } catch (e) {}
      });

      const res = await fetch("/api/admin/update-ig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies, payload })
      });
      const data = await res.json();
      if (data.status === "success") {
        addLog("✅ Configurações do Instagram atualizadas via Admin!");
        setAdminJson("");
      } else {
        throw new Error(data.message);
      }
    } catch (e: any) {
      addLog(`❌ Erro ao atualizar: ${e.message}`);
    } finally {
      setIsAdminUpdating(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    addLog(`Buscando dados no Instagram por: "${searchQuery}"...`);
    try {
      const res = await fetch("/api/ig/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
        addLog(`Concluído! ${data.length} usuários encontrados.`);
      } else {
        setSearchResults([]);
        addLog(`❌ Erro: ${data.error || "Resposta inesperada do servidor"}`);
      }
    } catch (e) {
      setSearchResults([]);
      addLog("Erro na pesquisa.");
    } finally {
      setIsSearching(false);
    }
  };

  const startBot = async (user: IGUser) => {
    addLog(`Alvo selecionado: @${user.username}`);
    addLog("Configurando conta para seguir o usuário automaticamente...");
    try {
      const res = await fetch("/api/ig/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.pk, username: user.username })
      });
      const data = await res.json();
      setActiveSession({
        userId: user.pk,
        username: user.username,
        state: 'sent_initial',
        threadId: data.threadId
      });
      addLog(`Mensagem inicial enviada: "Oi, você ${user.username}?"`);
      addLog("Aguardando resposta 'sim' no Direct do cliente...");
    } catch (e) {
      addLog("Erro ao iniciar automação.");
    }
  };

  useEffect(() => {
    if (activeSession && activeSession.state !== 'completed' && activeSession.state !== 'failed') {
      pollInterval.current = setInterval(async () => {
        try {
          const res = await fetch("/api/bot/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: activeSession.userId })
          });
          const data = await res.json();
          
          if (data.state !== activeSession.state) {
            if (data.state === 'sent_ask_test') {
              addLog(`Cliente @${activeSession.username} respondeu 'sim'!`);
              addLog(`Enviando proposta: "Você quer gerar teste IPTV de 6 horas?"`);
            } else if (data.state === 'generating') {
              addLog("Cliente aceitou o teste! Iniciando geração...");
              addLog("Gerando Credenciais no Painel...");
            } else if (data.state === 'completed') {
              addLog("✅ Credenciais geradas e enviadas com sucesso!");
              addLog("Sessão finalizada.");
            }
            setActiveSession(data);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000);
    } else {
      if (pollInterval.current) clearInterval(pollInterval.current);
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [activeSession]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Glassmorphic Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-6">
            <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-[0_10px_20px_rgba(79,70,229,0.3)] transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <Terminal className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-[900] tracking-tight bg-gradient-to-r from-white via-zinc-400 to-zinc-600 bg-clip-text text-transparent italic uppercase">
                SYNTH IG <span className="text-indigo-500">BOT</span>
              </h1>
              <p className="text-zinc-500 font-bold tracking-[0.2em] text-xs mt-1 uppercase">Advanced Automated Sales Hub</p>
            </div>
          </div>

          <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 self-start shadow-inner">
            <button 
              onClick={() => setActiveTab('client')}
              className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'client' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Instagram className="w-5 h-5" />
              Radar Alvos
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'admin' ? 'bg-zinc-800 text-white shadow-xl scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Key className="w-5 h-5" />
              Config Sessão
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {activeTab === 'client' ? (
            <>
              {/* Left Column: Search & List */}
              <div className="lg:col-span-5 space-y-8">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]"
                >
                  <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-zinc-400 uppercase tracking-tighter">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                    Injetar Alvo
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="Username..."
                      className="flex-1 bg-black/60 border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg font-bold placeholder:text-zinc-800 shadow-inner"
                      value={searchQuery}
                      onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      onClick={searchUsers}
                      disabled={isSearching}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl px-12 py-5 transition-all font-black flex items-center justify-center gap-4 shadow-[0_15px_30px_rgba(79,70,229,0.3)] hover:shadow-indigo-500/50 active:scale-95 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 group-hover:scale-125 transition-transform" />}
                      SCAN
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col"
                >
                  <div className="p-8 border-b border-white/5 bg-black/40 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-white text-xl tracking-tight italic">RADAR GLOBAL</h3>
                      <p className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.4em] mt-1">Satellite Feed Active</p>
                    </div>
                    <div className="flex gap-2">
                       <motion.div 
                         animate={{ scale: [1, 1.2, 1] }} 
                         transition={{ repeat: Infinity, duration: 2 }} 
                         className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]" 
                       />
                       <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/30" />
                    </div>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    {searchResults.length === 0 && !isSearching && (
                      <div className="py-32 text-center group">
                        <Instagram className="w-20 h-20 text-zinc-900 mx-auto mb-6 group-hover:text-indigo-900/20 transition-colors" />
                        <p className="text-zinc-800 font-black italic text-sm tracking-widest uppercase">Searching for signals...</p>
                      </div>
                    )}
                    <AnimatePresence>
                      {Array.isArray(searchResults) && searchResults.map((user, idx) => (
                        <motion.div 
                          key={user.pk}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-8 border-b border-white/5 hover:bg-indigo-600/5 transition-all flex items-center justify-between group cursor-pointer relative"
                        >
                          <div className="flex items-center gap-6">
                            <div className="relative">
                              <img 
                                src={`/api/proxy/image?url=${encodeURIComponent(user.profile_pic_url)}`} 
                                alt={user.username}
                                className="w-20 h-20 rounded-[2.2rem] border-2 border-white/10 bg-zinc-800 object-cover p-1.5 shadow-2xl group-hover:-rotate-3 group-hover:scale-110 transition-all duration-500"
                              />
                               <div className="absolute -top-1 -left-1 bg-indigo-600 p-1.5 rounded-xl border-2 border-zinc-950 shadow-lg">
                                <Instagram className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            <div>
                               <div className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors tracking-tighter">
                                 @{user.username}
                               </div>
                               <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1.5 opacity-60">{user.full_name || "Unidentified"}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => startBot(user)}
                            className="w-16 h-16 flex items-center justify-center bg-zinc-950 border border-white/5 hover:bg-indigo-600 text-indigo-500 hover:text-white rounded-[2rem] transition-all shadow-2xl active:scale-90 group-hover:shadow-indigo-500/20"
                          >
                            <Send className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Feed & Process */}
              <div className="lg:col-span-7 space-y-8">
                <AnimatePresence mode="wait">
                  {activeSession ? (
                    <motion.div 
                      key="active-session"
                      initial={{ opacity: 0, y: 30, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                      className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-2xl border border-indigo-500/20 rounded-[3rem] p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group"
                    >
                      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
                      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
                      
                      <div className="flex items-start justify-between mb-16 relative z-10">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
                              <User className="w-9 h-9 text-white" />
                           </div>
                           <div>
                             <h2 className="text-4xl font-black text-white tracking-tighter italic">@{activeSession.username}</h2>
                             <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em]">Active Pipeline Session</p>
                             </div>
                           </div>
                        </div>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setActiveSession(null)}
                            className="px-8 py-3 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black rounded-2xl border border-red-500/20 transition-all uppercase tracking-widest active:scale-95 shadow-lg"
                          >
                            Terminate
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 relative z-10">
                        {[
                          { label: 'Pipeline', step: 'sent_initial', icon: Send },
                          { label: 'Engage', step: 'sent_initial', icon: User },
                          { label: 'Pitch', step: 'sent_ask_test', icon: Package },
                          { label: 'Reward', step: 'completed', icon: Key },
                        ].map((item, idx) => {
                          const steps = ['idle', 'sent_initial', 'sent_ask_test', 'generating', 'completed'];
                          const currentIdx = steps.indexOf(activeSession.state);
                          // Lógica visual para progresso
                          const isCompleted = (idx === 0 && currentIdx > 1) || 
                                              (idx === 1 && currentIdx > 1) || 
                                              (idx === 2 && currentIdx > 2) || 
                                              (idx === 3 && activeSession.state === 'completed');

                          const isCurrent = activeSession.state === item.step || (item.step === 'completed' && activeSession.state === 'generating');

                          return (
                            <motion.div 
                              key={idx} 
                              whileHover={{ y: -5 }}
                              className={`p-8 rounded-[2.5rem] border-2 transition-all duration-700 relative overflow-hidden group/card ${
                                isCompleted 
                                  ? 'bg-white border-white shadow-[0_20px_40px_rgba(255,255,255,0.1)]' 
                                  : isCurrent 
                                    ? 'bg-indigo-600 border-indigo-400 shadow-[0_20px_40px_rgba(79,70,229,0.3)] animate-pulse' 
                                    : 'bg-black/40 border-white/5'
                              }`}
                            >
                              {isCompleted && <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="w-12 h-12 text-black" /></div>}
                              <item.icon className={`w-10 h-10 mb-6 transition-colors duration-500 ${isCompleted ? 'text-indigo-600' : isCurrent ? 'text-white' : 'text-zinc-800'}`} />
                              <div className={`text-[10px] font-black tracking-widest mb-2 uppercase ${isCompleted ? 'text-zinc-400' : isCurrent ? 'text-indigo-200' : 'text-zinc-600'}`}>{item.label}</div>
                              <div className={`text-sm font-black italic tracking-tight ${isCompleted ? 'text-black' : isCurrent ? 'text-white' : 'text-zinc-800'}`}>
                                {isCompleted ? 'COMPLETE' : isCurrent ? 'IN PROGRESS' : 'QUEUED'}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      <AnimatePresence mode="wait">
                        {activeSession.state === 'generating' && (
                          <motion.div 
                             initial={{ opacity: 0, scale: 0.9 }}
                             animate={{ opacity: 1, scale: 1 }}
                             className="bg-indigo-600 border-4 border-white/10 rounded-[3rem] p-20 text-center shadow-3xl shadow-indigo-600/50"
                          >
                             <div className="relative inline-block mb-10">
                                <Loader2 className="w-24 h-24 text-white animate-spin mx-auto" />
                                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full animate-pulse" />
                             </div>
                             <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-4">SYNTHESIZING...</h3>
                             <p className="text-indigo-100 font-bold text-xl tracking-tight">Deploying High-Latency Bypass Layer.</p>
                          </motion.div>
                        )}

                        {activeSession.state === 'completed' && (
                          <motion.div 
                            initial={{ y: 30, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className="bg-white rounded-[3rem] p-12 flex flex-col lg:flex-row items-center gap-10 shadow-[0_40px_80px_rgba(255,255,255,0.1)] group/done relative overflow-hidden"
                          >
                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                             <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-600/30 rotate-3 group-hover/done:rotate-0 transition-all duration-500">
                                <CheckCircle2 className="w-16 h-16 text-white" />
                             </div>
                             <div className="text-center lg:text-left flex-1 relative z-10">
                               <h3 className="text-4xl font-black text-black mb-4 tracking-tighter italic">MISSION SUCCESS!</h3>
                               <p className="text-zinc-500 font-bold text-xl leading-tight">
                                  Secure tokens dispatched to <span className="text-black border-b-2 border-indigo-500">@{activeSession.username}</span>.
                               </p>
                             </div>
                             <a 
                               href={`https://www.instagram.com/direct/t/${activeSession.threadId}/`}
                               target="_blank"
                               rel="noreferrer"
                               className="px-12 py-8 bg-black hover:bg-indigo-700 text-white font-black rounded-[2rem] transition-all shadow-3xl flex items-center gap-4 active:scale-95 text-xl tracking-tighter italic group/btn"
                             >
                               VER CHAT <ExternalLink className="w-7 h-7 group-hover/btn:translate-x-1 transition-transform" />
                             </a>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="no-active-session"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-zinc-900/20 border-4 border-dashed border-white/[0.03] rounded-[3rem] p-40 text-center group"
                    >
                       <div className="relative inline-block mb-8">
                          <Terminal className="w-24 h-24 text-zinc-900 mx-auto group-hover:text-zinc-800 transition-colors" />
                          <Search className="w-10 h-10 text-indigo-500/20 absolute -bottom-2 -right-2 animate-bounce" />
                       </div>
                       <p className="text-zinc-800 font-black text-2xl uppercase tracking-[0.3em] italic">Sector Scan Ready</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col h-[550px]"
                >
                  <div className="p-8 border-b border-white/5 bg-black/60 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-400/80 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                      </div>
                      <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] ml-6">Synthetic Kernel Logging</h2>
                    </div>
                    <div className="px-5 py-2.5 bg-indigo-600/10 text-[10px] font-black text-indigo-400 rounded-2xl border border-indigo-500/20 uppercase tracking-widest">Protocol 3.5.2</div>
                  </div>
                  <div className="flex-1 bg-[#050505]/90 p-10 font-mono text-sm overflow-y-auto custom-scrollbar">
                    <AnimatePresence>
                      {logs.map((log, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mb-4 leading-relaxed flex gap-6 group/log animate-in fade-in slide-in-from-left-2 duration-300 ${
                            log.includes('❌') ? 'text-red-500' : 
                            log.includes('✅') || log.includes('Concluído') ? 'text-green-400 font-bold bg-green-400/5 py-1 px-3 rounded-xl border border-green-400/10' : 
                            'text-zinc-400 shadow-sm'
                          }`}
                        >
                          <span className="text-zinc-900 font-black shrink-0 tabular-nums">{(i+1).toString().padStart(3, '0')}</span> 
                          <span className="text-zinc-800 font-black shrink-0">::</span>
                          <span className="break-all tracking-tight group-hover/log:text-zinc-300 transition-colors">{log}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div className="flex items-center gap-4 mt-8 opacity-40">
                       <span className="text-indigo-500 animate-pulse font-black text-xl">▋</span>
                       <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">System Awaiting Interrupt</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          ) : (
            <div className="lg:col-span-12">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 border border-white/5 rounded-[3rem] p-12 shadow-3xl max-w-5xl mx-auto relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Terminal className="w-64 h-64 text-white" />
                </div>

                <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="p-6 bg-zinc-800 rounded-3xl shadow-2xl">
                    <Key className="w-12 h-12 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black italic tracking-tighter">SESSÃO DINÂMICA</h2>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Atualize tokens bypass do Direct Messenger</p>
                  </div>
                </div>

                <div className="space-y-10 relative z-10">
                  <div className="relative group">
                    <textarea 
                      value={adminJson}
                      onChange={(e) => setAdminJson(e.target.value)}
                      placeholder='Cole aqui os blocos JSON do Instagram (Payload e Cookies)...'
                      className="w-full h-96 bg-black border-2 border-white/5 rounded-[2.5rem] p-10 font-mono text-zinc-300 focus:outline-none focus:border-indigo-600 transition-all custom-scrollbar text-base shadow-2xl"
                    />
                    <div className="absolute top-6 right-8 text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 uppercase tracking-widest">
                       SECURE_RAW_INPUT
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-black/40 border border-white/5 rounded-[2rem]">
                       <h4 className="text-white font-[900] uppercase tracking-tighter mb-4 flex items-center gap-2 italic">
                         <Play className="w-4 h-4 text-indigo-500 shrink-0" />
                         PROCESSO DE CAPTURA
                       </h4>
                       <ul className="text-xs text-zinc-500 space-y-4 font-bold">
                          <li className="flex gap-4">
                            <span className="text-indigo-500">01.</span>
                            Abra o Console do Navegador (F12) no Instagram Web.
                          </li>
                          <li className="flex gap-4">
                            <span className="text-indigo-500">02.</span>
                            Aba Network {"->"} Filtre "graphql". Clique com botão direito {"->"} "Copy all as JSON".
                          </li>
                          <li className="flex gap-4">
                            <span className="text-indigo-500">03.</span>
                            Cole integralmente no campo acima para o robô herdar a sessão.
                          </li>
                       </ul>
                    </div>

                    <button 
                      onClick={updateIGSession}
                      disabled={isAdminUpdating || !adminJson}
                      className="h-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-5 text-white font-[900] text-3xl uppercase tracking-tighter rounded-[2rem] transition-all shadow-3xl shadow-indigo-600/20 flex flex-col items-center justify-center gap-4 group active:scale-95 italic"
                    >
                      {isAdminUpdating ? <Loader2 className="w-12 h-12 animate-spin" /> : <Instagram className="w-12 h-12 group-hover:rotate-12 transition-transform" />}
                      SYNC SESSION
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #09090b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 10px;
          border: 2px solid #09090b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
      `}</style>
    </div>
  );
}
