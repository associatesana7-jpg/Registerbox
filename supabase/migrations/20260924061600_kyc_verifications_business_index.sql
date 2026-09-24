create index kyc_verifications_business_id_idx
  on public.kyc_verifications(business_id)
  where business_id is not null;
