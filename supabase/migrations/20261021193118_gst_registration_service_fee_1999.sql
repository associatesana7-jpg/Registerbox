-- The catalogue determines new GST registration quotes and order items.
-- Existing orders retain the fees recorded when they were created.
update public.services
set service_fee = 1999,
    updated_at = now()
where slug = 'gst-registration';
