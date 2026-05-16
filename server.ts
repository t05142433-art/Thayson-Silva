import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// CONFIGURAÇÕES INSTAGRAM (Exatamente como nos logs REAIS fornecidos)
const COOKIES = {
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

const BASE_PAYLOAD = {
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
  __csr: "gR2sbjYv90Ctl4T2W94iRtsghJ9I8--SGyRRZvaV9eahb8KD-jh8xahvDG-SimaVpZWvZbihpZl8GEzGGGmAut3y16hojJaV94SbGjENmHA8F8NqyWSaTJG-jiAykmroOnCBZ1qKy5CZ7xqFpGVHykq6LKiVUCuKmAdAKUy8yVu2K7oixKjAGbyorcEGh49HyFXzd296HDTKeUixV6wyghUuzqhUlyrwLDzu23xeqFEymiZ2F86-0yo2GzE04VS0Go0ei81p8021jw0h0E7ejw5NgdU0Eq3209swem0v-0eAx-p08K0ym0ZU420cKwpya4A0W8dEcEYyUiwkA1lyEIw0Wyp0Zw4tw89DwlobQ17Az817pn40gEcBa04DF862012pw3no06Nq4UlS",
  fb_dtsg: "NAfxHJPby_CHhK8Mb1FjhPpImTkMGl_5-OS7UnwLCa-6fv9126V6ktQ:17858225011064242:1778889274",
  jazoest: "26072",
  lsd: "r828hSEEem715v1xvu-RHO",
  __spin_r: "1039617489",
  __spin_b: "trunk",
  __spin_t: "1778893920"
};

const HEADERS = {
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
  "x-csrftoken": COOKIES.csrftoken,
  "x-ig-app-id": "1217981644879628",
  "x-fb-lsd": BASE_PAYLOAD.lsd,
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

const cookieString = Object.entries(COOKIES).map(([k, v]) => `${k}=${v}`).join("; ");

const igRequest = axios.create({
  headers: {
    ...HEADERS,
    "cookie": cookieString
  }
});

// Helper: 19-digit threading ID
function generateThreadingId() {
  return Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join("");
}

// Image Proxy to avoid CORS/Referer issues
app.get("/api/proxy/image", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("No URL");
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'user-agent': HEADERS["user-agent"],
        'referer': 'https://www.instagram.com/'
      }
    });
    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (e) {
    res.status(500).send("Proxy error");
  }
});

// In-memory state for bot sessions
const sessions: Record<string, {
  userId: string;
  username: string;
  threadId: string | null;
  state: 'idle' | 'sent_initial' | 'sent_ask_test' | 'generating' | 'completed' | 'failed';
  lastMessageId: string | null;
}> = {};

// Helper: IPTV API
async function generateIPTV() {
  try {
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

// API Routes
app.post("/api/ig/search", async (req, res) => {
  const { query } = req.body;
  try {
    const payload = new URLSearchParams({
      ...BASE_PAYLOAD,
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

    const response = await igRequest.post("https://www.instagram.com/graphql/query", payload);
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
    // 1. Follow User
    const followUrl = `https://www.instagram.com/api/v1/friendships/create/${userId}/`;
    await igRequest.post(followUrl, new URLSearchParams({
      container_module: "profile",
      nav_chain: "PolarisProfileRoot:profile:1:unexpected"
    }));

    // 2. Create Thread
    const threadResponse = await igRequest.post("https://www.instagram.com/api/v1/direct_v2/create_group_thread/", new URLSearchParams({
      recipient_users: JSON.stringify([userId.toString()]),
      jazoest: "22813"
    }));
    
    const threadId = (threadResponse.data as any).thread_v2_id || (threadResponse.data as any).thread_id;
    
    // 3. Send Initial Message
    const initialText = `Oi, você ${username}?`;
    const sendPayload = new URLSearchParams({
      ...BASE_PAYLOAD,
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

    await igRequest.post("https://www.instagram.com/api/graphql", sendPayload);

    sessions[userId] = {
      userId,
      username,
      threadId,
      state: 'sent_initial',
      lastMessageId: null
    };

    res.json({ status: "ok", threadId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start bot" });
  }
});

app.get("/api/bot/status/:userId", (req, res) => {
  const session = sessions[req.params.userId];
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

app.post("/api/bot/check", async (req, res) => {
  const { userId } = req.body;
  const session = sessions[userId];
  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    // Fetch latest messages from thread
    const threadUrl = `https://www.instagram.com/api/v1/direct_v2/threads/${session.threadId}/`;
    const response = await igRequest.get(threadUrl);
    const messages = (response.data as any).thread.items || [];
    
    // Last message from the OTHER user
    const lastUserMessage = messages.find((m: any) => m.user_id !== COOKIES.ds_user_id);
    
    if (lastUserMessage && lastUserMessage.item_id !== session.lastMessageId) {
      const text = (lastUserMessage.text || "").toLowerCase().trim();
      session.lastMessageId = lastUserMessage.item_id;

      if (session.state === 'sent_initial' && text.includes('sim')) {
        // Step 2: Ask for IPTV test
        session.state = 'sent_ask_test';
        const msg = "Você quer gerar teste IPTV de 6 horas?";
        const sendPayload = new URLSearchParams({
          ...BASE_PAYLOAD,
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
        await igRequest.post("https://www.instagram.com/api/graphql", sendPayload);
      } else if (session.state === 'sent_ask_test' && text.includes('sim')) {
        // Step 3: Generate IPTV
        session.state = 'generating';
        
        // Notify user
        const waitingMsg = "Ok, aguarde um momento. Gerando seu teste IPTV...";
        const waitPayload = new URLSearchParams({
          ...BASE_PAYLOAD,
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
        await igRequest.post("https://www.instagram.com/api/graphql", waitPayload);

        // Call API
        const iptvData = await generateIPTV();
        if (iptvData) {
          const finalMsg = `--- Cliente #1 ---\nUsuário: ${iptvData.username}\nSenha: ${iptvData.password}\nLink M3U: ${iptvData.m3u_url}\n\nSessão finalizada com sucesso.`;
          
          const finalPayload = new URLSearchParams({
            ...BASE_PAYLOAD,
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
          await igRequest.post("https://www.instagram.com/api/graphql", finalPayload);
          session.state = 'completed';
        } else {
          session.state = 'failed';
        }
      }
    }
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Check failed" });
  }
});

// MONITOR DE GRUPO (👋 -> oiee "usuario")
const MONITOR_THREAD_ID = "1496168458853744";
const processedMessageIds = new Set<string>();

async function startMonitor() {
  console.log(`Iniciando monitoramento no grupo: ${MONITOR_THREAD_ID}...`);
  
  setInterval(async () => {
    try {
      const threadUrl = `https://www.instagram.com/api/v1/direct_v2/threads/${MONITOR_THREAD_ID}/`;
      const response = await igRequest.get(threadUrl);
      const thread = (response.data as any).thread;
      const messages = thread.items || [];
      const users = thread.users || [];
      
      // Mapear PK para Username para saber quem enviou
      const userMap: Record<string, string> = {};
      users.forEach((u: any) => {
        userMap[u.pk.toString()] = u.username;
      });

      for (const msg of messages) {
        // Ignorar mensagens enviadas pelo próprio robô
        if (msg.user_id.toString() === COOKIES.ds_user_id) continue;
        
        // Ignorar mensagens já processadas
        if (processedMessageIds.has(msg.item_id)) continue;
        
        const text = (msg.text || "");
        if (text.includes("👋")) {
          const senderUsername = userMap[msg.user_id.toString()] || "usuário";
          const replyText = `oiee ${senderUsername}`;
          
          console.log(`Detectado 👋 de ${senderUsername}. Respondendo...`);
          
          const sendPayload = new URLSearchParams({
            ...BASE_PAYLOAD,
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

          await igRequest.post("https://www.instagram.com/api/graphql", sendPayload);
          processedMessageIds.add(msg.item_id);
        }
        
        // Marcar como processada mesmo se não for um 👋 para não re-verificar
        processedMessageIds.add(msg.item_id);
      }
      
      // Limpar Set se ficar muito grande (manter apenas os últimos 100 por precaução)
      if (processedMessageIds.size > 200) {
        const idsArray = Array.from(processedMessageIds);
        const newIds = idsArray.slice(idsArray.length - 100);
        processedMessageIds.clear();
        newIds.forEach(id => processedMessageIds.add(id));
      }

    } catch (error: any) {
      // console.error("Erro no monitor:", error.message);
    }
  }, 5000); // Verificar a cada 5 segundos
}

// Vite middleware for development
async function startServer() {
  const PORT = 3000;
  
  // Iniciar monitoramento
  startMonitor();

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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
