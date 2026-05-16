import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';

// Environment detection for __dirname
const __filename = typeof process !== 'undefined' && (process as any).argv ? fileURLToPath(import.meta.url) : '';
const __dirname = typeof process !== 'undefined' && (process as any).argv ? path.dirname(__filename) : '';

// Supabase Client Helper
let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase credentials missing. Some features may not work.");
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

const app = express();
app.use(express.json());

// CONFIGURAÇÕES PADRÃO (Fallback se não houver no Banco)
const DEFAULT_COOKIES = {
  datr: "vozQaZ9FTfSuYSDOh8c3S56v",
  ig_did: "0A7CD33E-D3EC-401D-9761-77259A2493C3",
  ps_l: "1",
  ps_n: "1",
  mid: "aeWT0wABAAEsIxXdTnCzSQUzd_Yw",
  ig_nrcb: "1",
  dpr: "2.206249952316284",
  wd: "489x920",
  csrftoken: "z74sVzAK61AEWtTm7q2XXyY6Wqrs2Iqp",
  ds_user_id: "80209457261",
  sessionid: "80209457261%3A3JvME561jAntvQ%3A14%3AAYhBty-q1RXwMl-7zvATIGvlSjhhKvnvFxBECtJVyg",
  rur: "\"FRC\\05480209457261\\0541810429924:01fea73b4f8b68d858336fb5c14576c79923e52d82ded757bbb68306f7a62a7165e075ee\""
};

const DEFAULT_PAYLOAD = {
  av: "17841480197836182",
  __d: "www",
  __user: "0",
  __a: "1",
  __req: "u",
  __hs: "20589.HYP:instagram_web_pkg.2.1...0",
  dpr: "3",
  __ccg: "GOOD",
  __rev: "1039617489",
  __s: "mb09ac:bljszo:nipitr",
  __hsi: "7640291211434104620",
  __dyn: "7xeUjG1mxu1syaxG4Vp41twpUnwgU7SbzEdF8aUco2qwJyE2OwpUe8hw2nVE4W0qa321Rw8G11wBz81s8hwGwQwoEcE7O2l0Fwqo31w9O1TwQzXwae4UaEW4Umw9a3614xm0zK5o4q3y2616zo1wEbUGdwtU662O0Lo6-bwHwKG1pg2Xwr86C1mgO1uQp6x6Ub8nxui2K7E5y4Urwfybyohw5nyE7K1Hw4XwRyo",
  fb_dtsg: "NAfxHJPby_CHhK8Mb1FjhPpImTkMGl_5-OS7UnwLCa-6fv9126V6ktQ:17858225011064242:1778889274",
  jazoest: "26072",
  lsd: "r828hSEEem715v1xvu-RHO",
  __spin_r: "1039617489",
  __spin_b: "trunk",
  __spin_t: "1778893920"
};

const HEADERS_TEMPLATE = {
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
  "x-ig-app-id": "1217981644879628",
  "origin": "https://www.instagram.com",
  "referer": "https://www.instagram.com/",
  "accept": "*/*",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "content-type": "application/x-www-form-urlencoded",
  "sec-ch-ua": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\"",
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": "\"Android\"",
  "sec-ch-ua-platform-version": "\"16.0.0\"",
  "sec-ch-ua-model": "\"SM-A155M\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-requested-with": "XMLHttpRequest",
  "x-asbd-id": "359341"
};

// Stateless IG Instance helper
async function getIGInstance() {
  const supabase = getSupabase();
  const { data: configRows } = await supabase.from('ig_config').select('*');
  const cookies = configRows?.find(r => r.key === 'cookies')?.value || DEFAULT_COOKIES;
  const payload = configRows?.find(r => r.key === 'payload')?.value || DEFAULT_PAYLOAD;

  const cookieString = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  
  return {
    cookies,
    payload,
    request: axios.create({
      headers: {
        ...HEADERS_TEMPLATE,
        "x-csrftoken": cookies.csrftoken,
        "x-fb-lsd": payload.lsd,
        "cookie": cookieString
      }
    })
  };
}

// Helper: 19-digit threading ID
function generateThreadingId() {
  return Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join("");
}

// Image Proxy (Necessary even in Edge, but can be a simple function)
app.get("/api/proxy/image", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("No URL");
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'user-agent': HEADERS_TEMPLATE["user-agent"],
        'referer': 'https://www.instagram.com/'
      }
    });
    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (e) {
    res.status(500).send("Proxy error");
  }
});

// Helper: IPTV API
async function performSynthLogin() {
  try {
    await axios.post('https://server-synth-ai.lovable.app/api/public/s/ge238wa17n', {
      "action": "Login",
      "captcha": "not-a-robot",
      "captchaChecked": true,
      "username": "thaysonsilvacavalcante555@gmail.com ",
      "password": "Thayson13.@",
      "twofactor_code": "",
      "twofactor_recovery_code": "",
      "twofactor_trusted_device_id": ""
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Erro no Synth Login:", error);
  }
}

async function generateIPTV() {
  try {
    await performSynthLogin();
    const response = await axios.post('https://server-synth-ai.lovable.app/api/public/s/ge238wa17n', {
      action: "criar_cliente",
      server_id: "BV4D3rLaqZ",
      package_id: "z2BDvoWrkj",
      trial_hours: 6,
      connections: 1,
      bouquets: "",
      parent_can_edit_personal_data: "YES",
      username: Math.floor(100000000 + Math.random() * 900000000).toString(),
      password: Math.floor(100000000 + Math.random() * 900000000).toString()
    });
    return (response.data as any).data;
  } catch (error) {
    console.error("Erro ao gerar IPTV:", error);
    return null;
  }
}

// API Routes (Functions)
app.post("/api/ig/search", async (req, res) => {
  const { query } = req.body;
  try {
    const { payload, request } = await getIGInstance();
    const searchPayload = new URLSearchParams({
      ...payload,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "PolarisSearchBoxRefetchableQuery",
      variables: JSON.stringify({
        data: {
          context: "blended",
          include_reel: "true",
          query: query,
          rank_token: "",
          search_session_id: "ed67d9e4-76b7-4b7d-b182-a34fd137a4f3",
          search_surface: "web_top_search"
        },
        hasQuery: true
      }),
      doc_id: "35248861834757183"
    });

    const response = await request.post("https://www.instagram.com/graphql/query", searchPayload);
    const users = (response.data as any).data?.xdt_api__v1__fbsearch__topsearch_connection?.users || [];
    res.json(users.map((u: any) => ({
      username: u.user.username,
      pk: u.user.pk,
      profile_pic_url: u.user.profile_pic_url,
      full_name: u.user.full_name
    })));
  } catch (error) {
    res.status(500).json({ error: "Failed to search users" });
  }
});

app.post("/api/ig/start", async (req, res) => {
  const { userId, username } = req.body;
  try {
    const { payload, request } = await getIGInstance();

    // 1. Follow User
    const followUrl = `https://www.instagram.com/api/v1/friendships/create/${userId}/`;
    await request.post(followUrl, new URLSearchParams({
      container_module: "profile",
      nav_chain: "PolarisProfileRoot:profile:1:unexpected"
    }));

    // 2. Create Thread
    const threadResponse = await request.post("https://www.instagram.com/api/v1/direct_v2/create_group_thread/", new URLSearchParams({
      recipient_users: JSON.stringify([userId.toString()]),
      jazoest: "22813"
    }));
    
    const threadId = (threadResponse.data as any).thread_v2_id || (threadResponse.data as any).thread_id;
    
    // 3. Send Initial Message
    const initialText = `Olá @${username}! 👋\n\n` +
      `Espero que sua semana esteja sendo fantástica! Vi que você tem interesse em conteúdos de alta qualidade e gostaria de te apresentar algo exclusivo do *Sindicato do Streaming*.\n\n` +
      `Você gostaria de falar sobre as melhores opções de entretenimento digital hoje? Posso te mostrar como ter acesso a tudo em um só lugar. 📺✨`;
    const sendPayload = new URLSearchParams({
      ...payload,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "IGDirectTextSendMutation",
      variables: JSON.stringify({
        ig_thread_igid: threadId.toString(),
        offline_threading_id: generateThreadingId(),
        recipient_igids: null,
        text: { sensitive_string_value: initialText },
        mentions: [],
        mentioned_user_ids: [],
        send_attribution: "igd_web_chat_tab:in_thread"
      }),
      doc_id: "26911679871773184"
    });

    await request.post("https://www.instagram.com/api/graphql", sendPayload);

    // Save session to Supabase
    const supabase = getSupabase();
    await supabase.from('bot_sessions').upsert({
      userId: userId.toString(),
      username,
      threadId: threadId.toString(),
      state: 'sent_initial',
      lastMessageId: null,
      updated_at: new Date().toISOString()
    });

    res.json({ status: "ok", threadId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start bot" });
  }
});

app.get("/api/bot/status/:userId", async (req, res) => {
  const supabase = getSupabase();
  const { data: session } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('userId', req.params.userId)
    .single();
    
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

app.post("/api/bot/check", async (req, res) => {
  const { userId } = req.body;
  const supabase = getSupabase();
  const { data: session } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('userId', userId.toString())
    .single();

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const { cookies, payload, request } = await getIGInstance();
    await performSynthLogin();

    // Fetch latest messages from thread
    const threadUrl = `https://www.instagram.com/api/v1/direct_v2/threads/${session.threadId}/`;
    const response = await request.get(threadUrl);
    const messages = (response.data as any).thread.items || [];
    
    // Last message from the OTHER user
    const lastUserMessage = messages.find((m: any) => m.user_id.toString() !== cookies.ds_user_id.toString());
    
    if (lastUserMessage && lastUserMessage.item_id !== session.lastMessageId) {
      const text = (lastUserMessage.text || "").toLowerCase().trim();
      session.lastMessageId = lastUserMessage.item_id;

      if (session.state === 'sent_initial' && text.includes('sim')) {
        session.state = 'sent_ask_test';
        const msg = `Excelente escolha! 🚀\n\n` +
          `Para você sentir a qualidade do nosso servidor na prática, eu posso liberar um *Teste VIP de 6 horas* agora mesmo para você. Totalmente Grátis!\n\n` +
          `Deseja que eu gere suas credenciais de acesso agora? (Responda "SIM" para gerar)`;
        const sendPayload = new URLSearchParams({
          ...payload,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "IGDirectTextSendMutation",
          variables: JSON.stringify({
            ig_thread_igid: session.threadId?.toString(),
            offline_threading_id: generateThreadingId(),
            recipient_igids: null,
            text: { sensitive_string_value: msg },
            mentions: [],
            mentioned_user_ids: [],
            send_attribution: "igd_web_chat_tab:in_thread"
          }),
          doc_id: "26911679871773184"
        });
        await request.post("https://www.instagram.com/api/graphql", sendPayload);
      } else if (session.state === 'sent_ask_test' && text.includes('sim')) {
        session.state = 'generating';
        
        const waitingMsg = `⚡ *SOLICITAÇÃO RECEBIDA* ⚡\n\n` +
          `Estou conectando ao nosso servidor seguro para gerar sua linha exclusiva. Por favor, aguarde alguns segundos enquanto preparo tudo para você... ⏳`;
        const waitPayload = new URLSearchParams({
          ...payload,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "IGDirectTextSendMutation",
          variables: JSON.stringify({
            ig_thread_igid: session.threadId?.toString(),
            offline_threading_id: generateThreadingId(),
            recipient_igids: null,
            text: { sensitive_string_value: waitingMsg },
            mentions: [],
            mentioned_user_ids: [],
            send_attribution: "igd_web_chat_tab:in_thread"
          }),
          doc_id: "26911679871773184"
        });
        await request.post("https://www.instagram.com/api/graphql", waitPayload);

        const iptvData = await generateIPTV();
        if (iptvData) {
          const finalMsg = `💎 *CRIAÇÃO CONCLUÍDA COM SUCESSO!* 💎\n\n` +
            `Aqui estão seus dados de acesso para o teste de 6 horas na maior estabilidade do Brasil:\n\n` +
            `👤 *Usuário:* ${iptvData.username}\n` +
            `🔑 *Senha:* ${iptvData.password}\n` +
            `🌐 *Link M3U:* ${iptvData.m3u_url}\n\n` +
            `💡 *Dica:* Utilize o aplicativo *IPTV Smarters* ou similar para a melhor experiência. Se precisar de ajuda na configuração, é só me chamar!\n\n` +
            `Sessão de entrega finalizada. Aproveite! 🍿🥤`;
          
          const finalPayload = new URLSearchParams({
            ...payload,
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "IGDirectTextSendMutation",
            variables: JSON.stringify({
              ig_thread_igid: session.threadId?.toString(),
              offline_threading_id: generateThreadingId(),
              recipient_igids: null,
              text: { sensitive_string_value: finalMsg },
              mentions: [],
              mentioned_user_ids: [],
              send_attribution: "igd_web_chat_tab:in_thread"
            }),
            doc_id: "26911679871773184"
          });
          await request.post("https://www.instagram.com/api/graphql", finalPayload);
          session.state = 'completed';
        } else {
          session.state = 'failed';
        }
      }
      // Sync back to Supabase
      const supabase = getSupabase();
      await supabase.from('bot_sessions').upsert({
        ...session,
        updated_at: new Date().toISOString()
      });
    }
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Check failed" });
  }
});

app.post("/api/admin/update-ig", async (req, res) => {
  const { cookies, payload } = req.body;
  const supabase = getSupabase();
  try {
    if (cookies) await supabase.from('ig_config').upsert({ key: 'cookies', value: cookies });
    if (payload) await supabase.from('ig_config').upsert({ key: 'payload', value: payload });
    res.json({ status: "success", message: "Configurações sincronizadas no Supabase!" });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// MONITOR DE GRUPO (Stateless logic intended for Cron)
const MONITOR_THREAD_ID = "1496168458853744";

async function runMonitorOnce() {
  try {
    const { cookies, payload, request } = await getIGInstance();
    const threadUrl = `https://www.instagram.com/api/v1/direct_v2/threads/${MONITOR_THREAD_ID}/`;
    const response = await request.get(threadUrl);
    const thread = (response.data as any).thread;
    const messages = thread.items || [];
    const users = thread.users || [];
    
    // Mapear PK para Username
    const userMap: Record<string, string> = {};
    users.forEach((u: any) => userMap[u.pk.toString()] = u.username);

    const supabase = getSupabase();
    for (const msg of messages) {
      if (msg.user_id.toString() === cookies.ds_user_id.toString()) continue;
      
      // Check if already processed in Supabase
      const { data: alreadyProcessed } = await supabase
        .from('processed_messages')
        .select('*')
        .eq('item_id', msg.item_id)
        .single();
        
      if (alreadyProcessed) continue;

      const text = (msg.text || "");
      if (text.includes("👋")) {
        const senderUsername = userMap[msg.user_id.toString()] || "amigo(a)";
        const replyText = `🌟 Olá, @${senderUsername}! Tudo bem com você? 🌟\n\n` +
          `Notei que você deu um "oi" aqui no grupo! Se você estiver procurando o melhor do entretenimento com estabilidade total de sinal, você está no lugar certo! 🚀\n\n` +
          `✨ *O que oferecemos:* ✨\n` +
          `✅ Canais 4K/UHD\n` +
          `✅ Filmes que acabaram de sair do cinema\n` +
          `✅ Séries de todas as plataformas\n` +
          `✅ Suporte 24h\n\n` +
          `Deseja receber um teste grátis de 6 horas agora mesmo? É só me chamar no privado ou aguardar que logo entro em contato! 💎`;
        
        const sendPayload = new URLSearchParams({
          ...payload,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "IGDirectTextSendMutation",
          variables: JSON.stringify({
            ig_thread_igid: MONITOR_THREAD_ID,
            offline_threading_id: generateThreadingId(),
            recipient_igids: null,
            text: { sensitive_string_value: replyText },
            mentions: [],
            mentioned_user_ids: [],
            send_attribution: "igd_web_chat_tab:in_thread"
          }),
          doc_id: "26911679871773184"
        });

        await request.post("https://www.instagram.com/api/graphql", sendPayload);
      }
      
      // Mark as processed
      await supabase.from('processed_messages').insert({ item_id: msg.item_id });
    }
  } catch (error) {
    // console.error("Monitor error", error);
  }
}

// In development, we still run the loop, but the logic is now stateless!
if (process.env.NODE_ENV !== "production") {
  setInterval(runMonitorOnce, 10000);
}

// Vite Config
async function startServer() {
  const PORT = 3000;
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Edge-Ready Server running on port ${PORT}`);
  });
}

startServer();
