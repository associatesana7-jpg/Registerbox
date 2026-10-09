type JsonSchema = Record<string, unknown>;

// Groq model IDs do not use OpenRouter's `:free` suffix.
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';

function apiKey() {
  return Deno.env.get('groq_API_KEY') ?? Deno.env.get('GROQ_API_KEY');
}

function extractJson(value: string) {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export async function callQwenStructured<T>({
  system,
  user,
  name,
  schema,
}: {
  system: string;
  user: string;
  name: string;
  schema: JsonSchema;
}): Promise<{ data: T; model: string; latencyMs: number }> {
  const key = apiKey();
  if (!key) throw new Error('GROQ_KEY_MISSING');

  const model = Deno.env.get('QWEN_MODEL') ?? DEFAULT_MODEL;
  const endpoint = Deno.env.get('GROQ_API_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
  const startedAt = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1800,
          temperature: 0.1,
          reasoning_effort: 'low',
          messages: [{ role: 'system', content: system + '\nReturn only a JSON object matching this schema: ' + JSON.stringify(schema) }, { role: 'user', content: user }],
          response_format: attempt === 0 ? { type: 'json_schema', json_schema: { name, strict: true, schema } } : { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = payload?.error?.message ?? `Qwen request failed with ${response.status}`;
        if ((response.status === 400 || response.status === 429 || response.status >= 500) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
          continue;
        }
        throw new Error(`AI provider HTTP ${response.status}: ${detail}`);
      }
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Qwen returned an empty response.');
      return { data: extractJson(content) as T, model, latencyMs: Date.now() - startedAt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2 && (lastError.name === 'TimeoutError' || lastError.message.includes('fetch'))) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
        continue;
      }
      break;
    }
  }
  throw lastError ?? new Error('Qwen request failed.');
}

export async function callQwenVisionStructured<T>({
  system,
  instruction,
  imageDataUrl,
  name,
  schema,
}: {
  system: string;
  instruction: string;
  imageDataUrl: string;
  name: string;
  schema: JsonSchema;
}): Promise<{ data: T; model: string; latencyMs: number }> {
  const key = apiKey();
  if (!key) throw new Error('GROQ_KEY_MISSING');
  const model = Deno.env.get('QWEN_VISION_MODEL') ?? Deno.env.get('QWEN_MODEL') ?? DEFAULT_MODEL;
  const endpoint = Deno.env.get('GROQ_API_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2400,
      temperature: 0,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: `${system}\nReturn only a JSON object matching this schema: ${JSON.stringify(schema)}` },
        { role: 'user', content: [{ type: 'text', text: instruction }, { type: 'image_url', image_url: { url: imageDataUrl } }] },
      ],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message ?? `Vision request failed with ${response.status}`;
    throw new Error(`AI provider HTTP ${response.status}: ${detail}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Qwen returned an empty bill extraction.');
  return { data: extractJson(content) as T, model, latencyMs: Date.now() - startedAt };
}
