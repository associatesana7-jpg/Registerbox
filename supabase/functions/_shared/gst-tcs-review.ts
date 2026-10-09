import {reviewPlatformImport,type PlatformContext,type PlatformRow} from './gst-platform-import.ts';
/** Source reconciliation only, not a GSTR-8 save schema or computed statutory TCS.
 * Source: CGST notification 12/2024, GSTR-8 supplier/POS and supply/return columns.
 * Registration, collection eligibility, rate, amendments and provider support remain separate.
 */
export function reviewOperatorTcs(rows:PlatformRow[],context:PlatformContext){
  if(context.role!=='operator')throw Error('TCS review belongs to the operator workspace.');
  const review=reviewPlatformImport(rows,[],context);
  const issues=review.issues.map(issue=>issue.message);
  if(review.duplicates.length)issues.push('Resolve duplicate documents before reconciling TCS.');
  type Group={supplierGstin:string;pos:string;gross:number;returned:number;net:number;tcsIgst:number;tcsCgst:number;tcsSgst:number;documents:string[];tcsComplete:boolean};
  const groups=new Map<string,Group>();
  for(const {row} of review.accepted){
    if(row.treatment!=='section52')continue;
    if(!row.supplierGstin){issues.push(`${row.document}: unregistered-supplier TCS treatment needs separate review.`);continue;}
    if(row.kind!=='invoice'&&row.kind!=='credit_note'){issues.push(`${row.document}: TCS amendments/debit adjustments need original statement review.`);continue;}
    const key=row.supplierGstin+'|'+row.pos;
    const group=groups.get(key)??{supplierGstin:row.supplierGstin,pos:row.pos,gross:0,returned:0,net:0,tcsIgst:0,tcsCgst:0,tcsSgst:0,documents:[],tcsComplete:true};
    group[row.kind==='credit_note'?'returned':'gross']+=Math.round(row.taxable*100);
    group.documents.push(row.document);
    if([row.tcsIgst,row.tcsCgst,row.tcsSgst].some(v=>v===undefined)){group.tcsComplete=false;issues.push(`${row.document}: source TCS amounts are missing; invoice GST is not TCS.`);}
    else{
      if(row.tcsIgst!&&(row.tcsCgst!||row.tcsSgst!)||Math.abs(row.tcsCgst!-row.tcsSgst!)>0.01)issues.push(`${row.document}: source TCS tax-head split needs review.`);
      for(const head of ['tcsIgst','tcsCgst','tcsSgst'] as const)group[head]+=(row.kind==='credit_note'?-1:1)*Math.round(row[head]!*100);
    }
    groups.set(key,group);
  }
  for(const group of groups.values()){
    group.net=group.gross-group.returned;
    if(group.net<0||group.tcsIgst<0||group.tcsCgst<0||group.tcsSgst<0)issues.push(`${group.supplierGstin} / ${group.pos}: negative amounts need prior-period adjustment review.`);
    for(const head of ['gross','returned','net','tcsIgst','tcsCgst','tcsSgst'] as const){if(!Number.isSafeInteger(group[head])||Math.abs(group[head])>1e13)issues.push('TCS totals exceed supported range.');group[head]/=100;}
  }
  return {groups:[...groups.values()],issues,filingAvailable:false as const,scope:'Source TCS reconciliation only. Confirm TCS registration, consideration collected, eligibility and effective rates before preparing GSTR-8.'};
}
