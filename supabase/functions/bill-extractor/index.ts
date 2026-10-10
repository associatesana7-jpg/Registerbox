import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import { corsHeaders, json } from '../_shared/http.ts';
import { callQwenVisionStructured } from '../_shared/qwen.ts';
import { PurchaseError, validateBooks, type Purchase } from '../_shared/gst-purchases.ts';

const MODEL = 'qwen/qwen3.8-27b';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const schema = {
  type: 'object',
  properties: {
    supplierName: { type: ['string', 'null'] },
    supplierGstin: { type: ['string', 'null'] },
    buyerGstin: { type: ['string', 'null'] },
    invoiceNumber: { type: ['string', 'null'] },
    invoiceDate: { type: ['string', 'null'], description: 'DD-MM-YYYY' },
    documentKind: { type: 'string', enum: ['INV', 'C', 'D'] },
    taxableValue: { type: ['number', 'null'] },
    igst: { type: ['number', 'null'] },
    cgst: { type: ['number', 'null'] },
    sgst: { type: ['number', 'null'] },
    cess: { type: ['number', 'null'] },
    invoiceTotal: { type: ['number', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 12 },
  },
  required: ['supplierName','supplierGstin','buyerGstin','invoiceNumber','invoiceDate','documentKind','taxableValue','igst','cgst','sgst','cess','invoiceTotal','confidence','warnings'],
  additionalProperties: false,
} as const;

type Extraction = {
  supplierName: string | null; supplierGstin: string | null; buyerGstin: string | null;
  invoiceNumber: string | null; invoiceDate: string | null; documentKind: 'INV'|'C'|'D';
  taxableValue: number | null; igst: number | null; cgst: number | null; sgst: number | null;
  cess: number | null; invoiceTotal: number | null; confidence: number; warnings: string[];
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function periodIsValid(year: unknown, month: unknown) {
  return Number.isInteger(year) && Number(year) >= 2017 && Number(year) <= 2100 && Number.isInteger(month) && Number(month) >= 1 && Number(month) <= 12;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401);
  const env = Deno.env.toObject();
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return json({ error: 'Please sign in again.' }, 401);
  const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const raw = await request.text();
    if (raw.length > 100_000) return json({ error: 'Request too large.' }, 413);
    const body = JSON.parse(raw);
    if (!['extract','add_to_books'].includes(body.action)) return json({ error: 'Unsupported bill action.' }, 400);
    const { data: business } = await admin.from('business_profiles').select('id,user_id,gstin').eq('id', body.businessId).is('deleted_at', null).maybeSingle();
    if (!business || business.user_id !== auth.user.id) return json({ error: 'This business is not available.' }, 403);

    if (body.action === 'extract') {
      const { count } = await admin.from('gst_bill_extractions').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).gte('created_at', new Date(Date.now() - 3600000).toISOString());
      if ((count ?? 0) >= 30) return json({ error: 'Bill extraction limit reached. Try again later.' }, 429);
      const { data: document } = await admin.from('documents').select('id,business_id,storage_path,original_filename,mime_type,uploaded_by').eq('id', body.documentId).is('deleted_at', null).maybeSingle();
      if (!document || document.business_id !== business.id || document.uploaded_by !== auth.user.id) return json({ error: 'The uploaded bill was not found.' }, 404);
      if (!['image/jpeg','image/png','image/webp'].includes(document.mime_type)) return json({ error: 'AI extraction supports JPG, PNG, and WEBP bill images. The original file remains saved.' }, 400);
      const { data: existing } = await admin.from('gst_bill_extractions').select('*').eq('user_id', auth.user.id).eq('document_id', document.id).maybeSingle();
      if (existing && existing.status !== 'failed') return json({ extractionId: existing.id, documentId: document.id, filename: document.original_filename, model: existing.model, confidence: Number(existing.confidence), warnings: existing.warnings, extracted: existing.extracted_json, status: existing.status });
      const { data: blob, error: downloadError } = await admin.storage.from('business-documents').download(document.storage_path);
      if (downloadError || !blob) throw new Error('The private bill image could not be read.');
      if (!blob.size || blob.size > MAX_IMAGE_BYTES) return json({ error: 'Choose a bill image between 1 byte and 10 MB.' }, 400);
      const imageDataUrl = `data:${document.mime_type};base64,${bytesToBase64(new Uint8Array(await blob.arrayBuffer()))}`;
      const system = 'You extract fields from Indian GST purchase invoices. Use only visible content. Never infer or invent identifiers or amounts. Return null for unreadable or absent values. A GSTIN is exactly 15 characters. Keep invoice numbers as printed. Convert dates to DD-MM-YYYY only when unambiguous. Taxable value excludes tax. IGST must not be combined with CGST and SGST. Add a warning for every uncertain, missing, inconsistent, or low-confidence field. This extraction is a draft for human review and is not tax advice.';
      const result = await callQwenVisionStructured<Extraction>({ system, instruction: 'Extract this purchase bill for a user-reviewed GST purchase-books draft.', imageDataUrl, name: 'gst_bill_extraction', schema });
      const extracted = result.data;
      const row = { user_id: auth.user.id, business_id: business.id, document_id: document.id, status: 'extracted', model: result.model, extracted_json: extracted, confidence: Math.max(0, Math.min(1, Number(extracted.confidence) || 0)), warnings: extracted.warnings, updated_at: new Date().toISOString() };
      const saved = existing
        ? await admin.from('gst_bill_extractions').update(row).eq('id', existing.id).select('*').single()
        : await admin.from('gst_bill_extractions').insert(row).select('*').single();
      if (saved.error) throw new Error('The extraction could not be saved.');
      await admin.from('documents').update({ ocr_status: 'completed', confidence: row.confidence, metadata_json: { extraction_id: saved.data.id, extraction_model: result.model, extraction_schema: 'gst-bill-v1' } }).eq('id', document.id);
      await admin.from('ai_runs').insert({ user_id: auth.user.id, operation: 'GST_BILL_EXTRACTION', model: result.model, status: 'SUCCEEDED', latency_ms: result.latencyMs, input_document_ids: [document.id], output_json: { extraction_id: saved.data.id, confidence: row.confidence, warnings: extracted.warnings } });
      return json({ extractionId: saved.data.id, documentId: document.id, filename: document.original_filename, model: result.model, confidence: row.confidence, warnings: extracted.warnings, extracted, status: 'extracted' });
    }

    if (body.consent !== true || body.approvalText !== 'I reviewed this bill and approve adding it to GST purchase books.') return json({ error: 'Review the extracted bill and approve adding it to purchase books.' }, 400);
    if (!periodIsValid(body.year, body.month)) return json({ error: 'Choose a valid GST purchase period.' }, 400);
    const { data: extraction } = await admin.from('gst_bill_extractions').select('*').eq('id', body.extractionId).eq('user_id', auth.user.id).eq('business_id', business.id).maybeSingle();
    if (!extraction) return json({ error: 'The bill extraction was not found.' }, 404);
    if (extraction.status === 'added_to_books') return json({ error: `This bill is already in ${String(extraction.added_month).padStart(2,'0')}/${extraction.added_year} purchase books.` }, 409);
    const purchase = validateBooks([{ ...body.purchase, sourceDocumentId: extraction.document_id, extractionId: extraction.id, source: 'AI_BILL' }])[0];
    const query = admin.from('gst_purchase_reconciliations').select('*').eq('user_id', auth.user.id).eq('business_id', business.id).eq('year', body.year).eq('month', body.month);
    const { data: saved } = await query.maybeSingle();
    const currentBooks = saved ? validateBooks(saved.books) : [];
    if (currentBooks.some((item) => item.extractionId === extraction.id || (item.supplier === purchase.supplier && item.kind === purchase.kind && item.number.toUpperCase() === purchase.number.toUpperCase()))) return json({ error: 'This bill is already in the selected purchase books.' }, 409);
    const books: Purchase[] = [...currentBooks, purchase];
    const values = { user_id: auth.user.id, business_id: business.id, gstin: business.gstin, year: body.year, month: body.month, books, revision: (saved?.revision ?? 0) + 1, report: null, snapshot: null, fetched_at: null, updated_at: new Date().toISOString() };
    if (!business.gstin) return json({ error: 'Link or save a GSTIN business profile before adding purchase bills.' }, 400);
    const result = saved
      ? await admin.from('gst_purchase_reconciliations').update(values).eq('id', saved.id).eq('revision', saved.revision).select('*').single()
      : await admin.from('gst_purchase_reconciliations').insert(values).select('*').single();
    if (result.error) return json({ error: 'Purchase books changed. Reload and approve again.' }, 409);
    await admin.from('gst_bill_extractions').update({ status: 'added_to_books', reviewed_json: purchase, reviewed_at: new Date().toISOString(), added_year: body.year, added_month: body.month, added_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', extraction.id);
    return json({ purchase: result.data, extractionId: extraction.id });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Bill extraction failed', detail.slice(0, 300));
    const message = detail === 'GROQ_KEY_MISSING' ? 'Bill AI is not configured. Add the groq_API_KEY Edge Function secret.' : detail.startsWith('AI provider HTTP') ? 'Groq could not read this bill. Try a clearer, straight-on image with good lighting.' : detail;
    return json({ error: error instanceof PurchaseError ? error.message : message || 'Bill extraction failed. The original file remains saved.' }, error instanceof PurchaseError ? 400 : 502);
  }
});
