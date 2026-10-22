export type GstReturnRoute = { form:'gstr-1'|'gstr-3b'; year:string; month:string; mode:'nil'|'regular' };
/** Never accept a free-form return URL or a return belonging to another business. */
export function gstResumeRoute(params: Record<string, unknown>, businessId:string): GstReturnRoute | null {
  if (['resumeBusiness','resumeForm','resumeYear','resumeMonth','resumeMode'].some(key=>typeof params[key]!=='string')) return null;
  if (params.resumeBusiness !== businessId || !['gstr-1','gstr-3b'].includes(String(params.resumeForm))) return null;
  const year=String(params.resumeYear),month=String(params.resumeMonth).padStart(2,'0');
  if (!/^20\d{2}$/.test(year) || !/^(0[1-9]|1[0-2])$/.test(month) || !['nil','regular'].includes(String(params.resumeMode))) return null;
  return {form:params.resumeForm as GstReturnRoute['form'],year,month,mode:params.resumeMode as GstReturnRoute['mode']};
}
export function gstReconnectParams(route:GstReturnRoute,businessId:string) {
  return {resumeBusiness:businessId,resumeForm:route.form,resumeYear:route.year,resumeMonth:route.month,resumeMode:route.mode};
}
