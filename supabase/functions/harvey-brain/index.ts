// Server-only sales brain. The OpenRouter credential never leaves Supabase.
// Custom bearer authentication: only a SHA-256 digest is deployed, not the token.
const TOKEN_HASH = '9c0bceaefe375ec47f133cd3610f36f3b488c222d9549e361e828bdcc463fa59';
const MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const MAX_BODY_BYTES = 180000;

function reply(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function handler(req: Request): Promise<Response> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (token.length < 32 || token.length > 128) return reply({ error: 'Unauthorized' }, 401);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const expected = TOKEN_HASH.match(/../g)!.map((b) => parseInt(b, 16));
  let mismatch = 0;
  for (let i = 0; i < digest.length; i++) mismatch |= digest[i] ^ expected[i];
  if (mismatch) return reply({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return reply({ error: 'POST required' }, 405);
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return reply({ error: 'OPENROUTER_API_KEY is missing in Supabase' }, 503);
  try {
    // Bound the actual stream, not just a caller-controlled Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: 'JSON body required' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return reply({ error: 'Prompt too large' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return reply({ error: 'Invalid JSON' }, 400); }
    if (!input || typeof input !== 'object') return reply({ error: 'Invalid request' }, 400);
    if (input.action === 'health') return reply({ ready: true, model: MODEL, free_only: true });
    if (typeof input.prompt !== 'string' || !input.prompt.trim()) return reply({ error: 'Prompt required' }, 400);
    if (input.model !== MODEL) return reply({ error: 'Only the configured free model is allowed' }, 400);
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(90000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'RegisterBox Harvey' },
      body: JSON.stringify({
        model: MODEL, messages: [{ role: 'user', content: input.prompt }],
        stream: false, max_tokens: 4096, tools: [], tool_choice: 'none',
        provider: { allow_fallbacks: false, max_price: { prompt: 0, completion: 0, request: 0 } },
      }),
    });
    if (!upstream.ok) {
      // Do not relay raw provider errors; they may include request content.
      const status = upstream.status;
      return reply({ error: status === 429 ? 'OpenRouter free quota or capacity reached; try later' : `OpenRouter rejected the request (HTTP ${status})`, upstream_status: status }, status === 429 ? 429 : 502);
    }
    const data = await upstream.json();
    const choice = data.choices?.[0];
    if (data.error || choice?.finish_reason !== 'stop' || choice?.message?.tool_calls?.length || typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) {
      return reply({ error: 'OpenRouter returned an incomplete or invalid text response' }, 502);
    }
    if (Number(data.usage?.cost || 0) !== 0) return reply({ error: 'Nonzero provider cost rejected' }, 502);
    return reply({ text: choice.message.content, model: MODEL, id: data.id || '', usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0, cost_usd: 0,
    } });
  } catch {
    return reply({ error: 'OpenRouter request failed or timed out; no fallback was used' }, 502);
  }
}

Deno.serve(handler);
