import { supabase } from '@/lib/supabase';
import type { BusinessIdentityResult } from '@/lib/registerbox-api';

export async function saveVerifiedGstProfile(result:BusinessIdentityResult) {
  if(!result.valid||result.identifierType!=='GSTIN')throw new Error('Fetch valid GST details before saving this profile.');
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)throw new Error('Please sign in again.');
  const {data:existing,error:findError}=await supabase.from('business_profiles').select('id').eq('user_id',auth.user.id).eq('gstin',result.identifier).is('deleted_at',null).maybeSingle();
  if(findError)throw findError;
  const values={gstin:result.identifier,pan:result.identifier.slice(2,12),legal_name:result.legalName,trade_name:result.tradeName||result.legalName,entity_type:result.entityType,constitution:result.entityType,status:'active'};
  let id=existing?.id;
  if(id){const {error}=await supabase.from('business_profiles').update(values).eq('id',id);if(error)throw error;}
  else {
    const {count,error:countError}=await supabase.from('business_profiles').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).not('gstin','is',null).is('deleted_at',null);
    if(countError)throw countError;
    if((count??0)>=15)throw new Error('You can connect up to 15 GST profiles. Remove an existing GST profile before adding another.');
    const {data,error}=await supabase.from('business_profiles').insert({...values,user_id:auth.user.id,created_by:auth.user.id,email:auth.user.email}).select('id').single();
    if(error){
      if(error.message.includes('GST_PROFILE_LIMIT'))throw new Error('You can connect up to 15 GST profiles. Remove an existing GST profile before adding another.');
      if(error.code!=='23505')throw error;
      const {data:concurrent}=await supabase.from('business_profiles').select('id').eq('user_id',auth.user.id).eq('gstin',result.identifier).is('deleted_at',null).maybeSingle();
      if(!concurrent)throw new Error('This GST profile could not be saved. Please contact support to check profile access.');
      id=concurrent.id;
    }else id=data.id;
  }
  const {error:linkError}=await supabase.from('kyc_verifications').update({business_id:id}).eq('id',result.verificationId).eq('user_id',auth.user.id);
  if(linkError)throw new Error('Business saved, but verification could not be linked. Retry to finish saving.');
  if(result.address&&result.city&&result.state&&/^[1-9]\d{5}$/.test(result.pincode||'')){
    const {data:address,error:addressLookup}=await supabase.from('business_addresses').select('id').eq('business_id',id).eq('type','principal').limit(1).maybeSingle();
    if(addressLookup)throw addressLookup;
    const addressValues={address_line_1:result.address,city:result.city,state:result.state,pincode:result.pincode!,verified:true};
    const response=address?await supabase.from('business_addresses').update(addressValues).eq('id',address.id):await supabase.from('business_addresses').insert({...addressValues,business_id:id,type:'principal'});
    if(response.error)throw new Error('Business saved, but its address could not be saved. Retry to complete the profile.');
  }
  return id;
}
