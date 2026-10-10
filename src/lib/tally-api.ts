import type { TallyCompany, TallyJob, TallyMode } from './tally-core';

export type TallyConnection = { url: string; token: string };
export function connectorUrl(raw: string): string {
  const url = new URL(raw.trim());
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw Error('Use a trusted HTTPS connector URL. HTTP is allowed only on this computer’s loopback address.');
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw Error('Enter the connector origin, without credentials, query parameters or a path.');
  return url.origin;
}
async function request<T>(connection: TallyConnection, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${connectorUrl(connection.url)}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${connection.token.trim()}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || `Connector returned ${response.status}.`);
    return result as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw Error('Connector timed out. Refresh import history before submitting again; a write may already be queued.');
    throw e;
  } finally { clearTimeout(timer); }
}
export const getTallyCompanies = (connection: TallyConnection) => request<{ companies: TallyCompany[] }>(connection, '/companies');
export const getTallyJobs = (connection: TallyConnection) => request<{ jobs: TallyJob[] }>(connection, '/jobs');
export const submitTallyImport = (connection: TallyConnection, company: TallyCompany, mode: TallyMode, csv: string) => request<TallyJob>(connection, '/imports', { company, mode, csv });
export const reconcileTallyJob = (connection: TallyConnection, id: string) => request<TallyJob>(connection, `/jobs/${id}/reconcile`, {});
