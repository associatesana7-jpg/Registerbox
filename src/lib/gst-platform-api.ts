import {supabase} from './supabase';
import type {PlatformContext} from '../../supabase/functions/_shared/gst-platform-import';
import type {publicPlatformWorkspace} from '../../supabase/functions/_shared/gst-platform-workspace';
export type SavedPlatformWorkspace=ReturnType<typeof publicPlatformWorkspace>;
export async function platformWorkspace(businessId:string,context:PlatformContext,input:{action:'load'}|{action:'import';csv:string;name:string;revision:number;consent:true}):Promise<{workspace:SavedPlatformWorkspace;duplicateFile?:boolean}> {
  const {data,error}=await supabase.functions.invoke('gst-platform-workspace',{body:{businessId,...context,...input}});
  if(error){
    let message='Could not reach saved imports. Reload before retrying.';
    try{const response=error.context;const result=await (response?.clone?response.clone():response)?.json();if(typeof result?.error==='string')message=result.error;}catch{/* Safe fallback. */}
    throw Error(message);
  }
  if(!data?.workspace||data.error)throw Error(data?.error||'No import workspace returned.');
  return data;
}
