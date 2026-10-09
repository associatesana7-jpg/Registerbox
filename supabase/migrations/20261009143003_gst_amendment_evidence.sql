alter table public.gst_return_drafts add column if not exists source_evidence jsonb;
comment on column public.gst_return_drafts.source_evidence is 'Server-derived amendment links to acknowledged filed archives, original/revised amounts, deltas and unresolved blockers. Never sent as GST payload.';
