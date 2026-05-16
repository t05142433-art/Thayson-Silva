// Supabase Edge Function Example (Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name} from Instagram Edge Bot!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/*
  Como migrar:
  1. No Supabase CLI, rode: supabase functions new ig-bot
  2. Copie a lógica do server.ts para dentro da função.
  3. Use Deno standard fetch em vez de axios se preferir (embora axios funcione via esm.sh).
*/
