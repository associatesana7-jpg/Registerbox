type JsonSchema = Record<string, unknown>;

const DEFAULT_MODEL = 'qwen/qwen3-30b-a3b:free';

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
  const key = Deno.env.get('qween_api_ai') ?? Deno.env.get('QWEEN_API_AI');
  if (!key) throw new Error('QWEN_KEY_MISSING');

  const model = Deno.env.get('QWEN_MODEL') ?? DEFAULT_MODEL;
  const endpoint = Deno.env.get('QWEN_API_URL') ?? 'https://openrouter.ai/api/v1/chat/completions';
  const startedAt = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': Deno.env.get('APP_URL') ?? 'https://registerbox.in',
          'X-Title': 'RegisterBox',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = payload?.error?.message ?? `Qwen request failed with ${response.status}`;
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
          continue;
        }
        throw new Error(detail);
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
