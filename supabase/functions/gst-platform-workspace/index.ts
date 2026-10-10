import {createClient} from 'npm:@supabase/supabase-js@2.117.1';
import {corsHeaders,json} from '../_shared/http.ts';
async function hash(text:string) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
import {appendPlatformImport,publicPlatformWorkspace} from '../_shared/gst-platform-workspace.ts';

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  const env=Deno.env.toObject(),authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return json({error:'Please sign in.'},401);
  const client=createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError||!auth.user)return json({error:'Please sign in again.'},401);
  const admin=createClient(env.SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const raw=await request.text();if(new TextEncoder().encode(raw).length>750000)return json({error:'Import a CSV smaller than 500 KB.'},413);
    const body=JSON.parse(raw);
    if(!body||!['load','import'].includes(body.action)||!['seller','operator'].includes(body.role)||typeof body.period!=='string'||!/^(0[1-9]|1[0-2])20\d{2}$/.test(body.period))return json({error:'Choose a valid period and business role.'},400);
    const {data:business,error:businessError}=await client.from('business_profiles').select('id,user_id').eq('id',body.businessId).is('deleted_at',null).maybeSingle();
    if(businessError||business?.user_id!==auth.user.id)return json({error:'Only the business owner can manage these imports.'},403);
    const {data:connection,error:connectionError}=await admin.from('gst_connections').select('gstin').eq('user_id',auth.user.id).eq('business_id',business.id).single();
    if(connectionError||!connection?.gstin||body.gstin!==connection.gstin)return json({error:'GST account changed. Reload before importing.'},409);
    const scope={user_id:auth.user.id,business_id:business.id,gstin:connection.gstin,period:body.period,role:body.role};
    let {data:workspace,error}=await admin.from('gst_platform_workspaces').select('revision,rows,batches').match(scope).maybeSingle();
    if(error)throw Error('Could not load saved imports.');
    workspace??={revision:0,rows:[],batches:[]};
    if(body.action==='load')return json({workspace:publicPlatformWorkspace(workspace)});
    if(body.consent!==true)return json({error:'Confirm saving this source report privately to your GST account.'},400);
    if(typeof body.csv!=='string'||typeof body.name!=='string')return json({error:'Choose a CSV source file.'},400);
    if(body.revision!==workspace.revision)return json({error:'Imports changed on another device. Reload and retry.'},409);
    let result;
    try {result=appendPlatformImport(workspace,{csv:body.csv,name:body.name,checksum:await hash(body.csv)},{gstin:connection.gstin,period:body.period,role:body.role});}
    catch(cause){return json({error:cause instanceof Error?cause.message:'Check the report.'},400);}
    if(result.duplicateFile)return json({workspace:publicPlatformWorkspace(workspace),duplicateFile:true});
    // One atomic write stores both source evidence and accepted records. Revision
    // comparison prevents concurrent devices from overwriting or double-counting.
    const query=workspace.revision===0
      ? admin.from('gst_platform_workspaces').insert({...scope,...result.workspace})
      : admin.from('gst_platform_workspaces').update({...result.workspace,updated_at:new Date().toISOString()}).match(scope).eq('revision',workspace.revision);
    const saved=await query.select('revision,rows,batches').maybeSingle();
    if(saved.error||!saved.data)return json({error:'Imports changed or could not be saved. Reload before retrying; no automatic repeat was made.'},409);
    return json({workspace:publicPlatformWorkspace(saved.data),review:result.review,duplicateFile:false});
  }catch{return json({error:'Could not complete the import request. Reload saved imports before retrying.'},500);}
});
