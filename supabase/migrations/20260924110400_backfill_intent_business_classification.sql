update public.business_profiles b
set
  business_category = coalesce(b.business_category, i.industry),
  business_subcategory = coalesce(b.business_subcategory, i.subindustry),
  updated_at = now()
from public.business_intents i
where i.existing_business_id = b.id
  and (b.business_category is null or b.business_subcategory is null)
  and (i.industry is not null or i.subindustry is not null);
