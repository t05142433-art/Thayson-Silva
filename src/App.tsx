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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IGUser[]>([]);
  const [activeSession, setActiveSession] = useState<BotSession | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
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
      setSearchResults(data);
      addLog(`Concluído! ${data.length} usuários encontrados.`);
    } catch (e) {
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Control Panel */}
        <div className="lg:col-span-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-600 rounded-xl">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">SISTEMA AUTOMATIZADO IPTV IG</h1>
              <p className="text-zinc-400">Automação real via Instagram Direct</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              Pesquisar Alvo
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite o nome de usuário..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchQuery}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={searchUsers}
                disabled={isSearching}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-6 py-2 transition-colors font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                Buscar
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="font-medium text-zinc-300">Resultados da Busca</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              {searchResults.length === 0 && !isSearching && (
                <div className="p-12 text-center text-zinc-500 italic">
                  Nenhum usuário encontrado na pesquisa.
                </div>
              )}
              {searchResults.map((user) => (
                <div 
                  key={user.pk}
                  className="p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={`/api/proxy/image?url=${encodeURIComponent(user.profile_pic_url)}`} 
                        alt={user.username}
                        className="w-12 h-12 rounded-full border-2 border-zinc-700 bg-zinc-800"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1 border-2 border-zinc-900">
                        <Instagram className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1">
                         @{user.username}
                      </div>
                      <div className="text-sm text-zinc-500 truncate max-w-[150px]">{user.full_name}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => startBot(user)}
                    className="p-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all"
                    title="Iniciar Automação"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Automation Feed & Status */}
        <div className="lg:col-span-7 space-y-6">
          {activeSession && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
             >
               <div className="absolute top-0 right-0 p-4 flex gap-2">
                  <button 
                    onClick={() => setActiveSession(null)}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-full border border-zinc-700 transition-colors"
                  >
                    Resetar
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-indigo-400 capitalize">{activeSession.state.replace('_', ' ')}</span>
                  </div>
               </div>

               <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                 <Terminal className="w-5 h-5 text-indigo-400" />
                 Status da Sessão: @{activeSession.username}
               </h2>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 {[
                   { label: 'Follow', step: 'sent_initial', icon: User },
                   { label: 'Oi, você?', step: 'sent_initial', icon: Send },
                   { label: 'Deseja Teste?', step: 'sent_ask_test', icon: Package },
                   { label: 'Gerar/Enviar', step: 'completed', icon: Key },
                 ].map((item, idx) => {
                   const steps = ['idle', 'sent_initial', 'sent_ask_test', 'generating', 'completed'];
                   const currentIdx = steps.indexOf(activeSession.state);
                   const targetIdx = steps.indexOf(item.step);
                   const isDone = currentIdx >= targetIdx && activeSession.state !== 'idle';
                   const isCurrent = activeSession.state === item.step || (item.step === 'completed' && activeSession.state === 'generating');

                   return (
                     <div key={idx} className={`p-4 rounded-2xl border transition-all ${
                       isDone ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-zinc-950/50 border-zinc-800'
                     }`}>
                       <item.icon className={`w-6 h-6 mb-2 ${isDone ? 'text-indigo-400' : 'text-zinc-600'}`} />
                       <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-bold">{item.label}</div>
                       {isDone ? (
                         <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                           <CheckCircle2 className="w-3 h-3" /> Concluído
                         </div>
                       ) : isCurrent ? (
                         <div className="flex items-center gap-1 text-indigo-400 text-xs font-bold animate-pulse">
                           <Loader2 className="w-3 h-3 animate-spin" /> Processando
                         </div>
                       ) : (
                         <div className="text-zinc-700 text-xs font-bold">Aguardando</div>
                       )}
                     </div>
                   );
                 })}
               </div>

               {activeSession.state === 'generating' && (
                 <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-xl p-8 text-center mb-6">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-indigo-400 animate-pulse">Gerando Credenciais no Painel...</h3>
                    <p className="text-zinc-500 text-sm mt-2">Aguardando retorno do servidor IPTV FiveTV</p>
                 </div>
               )}

               {activeSession.state === 'completed' && (
                 <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 flex items-start gap-4 mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    <div>
                      <h3 className="font-bold text-green-500 mb-1">Teste IPTV Enviado!</h3>
                      <p className="text-zinc-400 text-sm">O cliente recebeu as credenciais e o link M3U no Direct.</p>
                      <button className="mt-4 flex items-center gap-2 text-xs font-bold text-white bg-green-600 px-4 py-2 rounded-lg">
                        <ExternalLink className="w-4 h-4" /> Ver Conversa no Insta
                      </button>
                    </div>
                 </div>
               )}
             </motion.div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                Logs do Sistema
              </h2>
              <div className="text-xs font-mono text-zinc-600 uppercase tracking-tighter">Real-Time Interaction</div>
            </div>
            <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 p-4 font-mono text-xs overflow-y-auto custom-scrollbar space-y-1">
              <AnimatePresence>
                {logs.map((log, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={log.includes('Erro') ? 'text-red-400' : log.includes('Concluído') || log.includes('✅') ? 'text-green-400' : 'text-zinc-400'}
                  >
                    <span className="text-zinc-600">❯</span> {log}
                  </motion.div>
                ))}
              </AnimatePresence>
              {logs.length === 0 && (
                <div className="text-zinc-700 italic">Aguardando comandos...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
