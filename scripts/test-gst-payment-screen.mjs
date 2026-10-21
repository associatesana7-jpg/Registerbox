import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as payment from '../supabase/functions/_shared/gst-payment.ts';
const code=ts.transpileModule(fs.readFileSync('src/components/gst-payment-review.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx=(type,props)=>({type,props});
let hookValues=[],hookIndex=0,browserResult={type:'dismiss'},browserFailure=false,browserCalls=[],fundingCalls=0,refreshCalls=0;
const modules={react:{useState:initial=>{const i=hookIndex++;if(!(i in hookValues))hookValues[i]=initial;return [hookValues[i],value=>{hookValues[i]=value;}];}},'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Text:'Text',View:'View'},'expo-web-browser':{openBrowserAsync:async url=>{browserCalls.push(url);if(browserFailure)throw Error('Synthetic browser launch failure');return browserResult;}},'@/components/registerbox-ui':{Button:'Button',Field:'Field'},'./gst-checkbox':{GstCheckbox:'GstCheckbox'},'@/constants/design':{palette:{}},'../../supabase/functions/_shared/gst-payment':payment};
const exports={};new Function('require','exports',code)(name=>modules[name]??assert.fail(name),exports);
const charges=()=>Object.fromEntries(payment.HEADS.map(h=>[h,{tx:0,intr:0,fee:0}]));
const context={gstin:'29ABCDE1234F1Z5',liabilities:[{liab_ldg_id:0,trans_typ:30002,charges:charges()}],cash:charges(),credit:{igst:73.04,cgst:1080,sgst:1080,cess:0},blockedCredit:{igst:0,cgst:0,sgst:0,cess:0}};
const args={context,review:null,choices:Object.fromEntries(Object.entries(payment.emptyCredit()).map(([k,v])=>[k,String(v)])),onChoices(){},minimumCash:'',onMinimumCash(){},rulesReviewed:false,onRulesReviewed(){},disabled:false};
function nodes(tree){return Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];}
function render(overrides={}){hookIndex=0;return nodes(exports.GstPaymentReview({...args,...overrides}));}
function resetHooks(){hookValues=[];hookIndex=0;browserCalls=[];browserFailure=false;fundingCalls=0;refreshCalls=0;}
const zero=render();
assert.equal(zero.filter(n=>n.type==='Field').length,1,'Zero tax must not require eight meaningless credit inputs');
assert.ok(zero.some(n=>n.type==='GstCheckbox'),'Use an accessible real checkbox for allocation review');
assert.ok(JSON.stringify(zero).includes('zero-value offset / credit-posting'));
assert.ok(JSON.stringify(zero).includes('saved ITC claim is preserved'));
const allocation=payment.preparePayment(context,payment.emptyCredit(),0);
assert.equal(allocation.ready,true);assert.equal(allocation.totalShortfall,0);assert.equal(allocation.allocation.pdcash[0].ipd,0);
const payable=structuredClone(context);payable.liabilities[0].charges.igst.tx=100;
assert.equal(render({context:payable}).filter(n=>n.type==='Field').length,9,'Positive tax still exposes exact allocation choices');
assert.equal(render({choices:{...args.choices,i_pdi:'5'}}).filter(n=>n.type==='Field').length,9,'Never hide a stale nonzero allocation');

// Exercise the actual rendered funding button with a mocked system browser.
// Closing a browser may prompt an authoritative ledger read, never settlement.
const shortage=payment.preparePayment(payable,payment.emptyCredit(),0);
assert.equal(shortage.ready,false);assert.equal(shortage.totalShortfall,100);
const fundingArgs={context:payable,review:shortage,onFundingStarted:()=>fundingCalls++,onRefreshBalances:()=>refreshCalls++};
const addFunds=tree=>tree.find(n=>n.type==='Button'&&n.props.title.startsWith('Add ₹'));
const checkBalances=tree=>tree.find(n=>n.type==='Button'&&n.props.title==='Check payment & refresh balances');
const drain=()=>new Promise(resolve=>setImmediate(resolve));
for(const resultType of ['dismiss','cancel']){
  resetHooks();browserResult={type:resultType};
  const tree=render(fundingArgs);assert.equal(addFunds(tree).props.disabled,false);
  assert.ok(JSON.stringify(tree).includes('closing the page is not proof of payment'));
  addFunds(tree).props.onPress();
  assert.equal(fundingCalls,1,'Record the handoff before opening the browser');
  const busy=render(fundingArgs);assert.equal(addFunds(busy).props.disabled,true);assert.equal(checkBalances(busy).props.disabled,true);
  addFunds(busy).props.onPress();assert.equal(browserCalls.length,1,'Busy funding must not open a second payment page');
  await drain();
  assert.deepEqual(browserCalls,['https://services.gst.gov.in/services/login']);
  assert.equal(refreshCalls,1,'Dismiss/cancel triggers only the parent ledger-refresh callback');
  assert.equal(shortage.ready,false);assert.equal(shortage.totalShortfall,100,'Browser return is not payment confirmation');
  assert.equal(addFunds(render(fundingArgs)).props.disabled,false);
}

resetHooks();browserResult={type:'opened'};
addFunds(render(fundingArgs)).props.onPress();await drain();
assert.equal(fundingCalls,1);assert.equal(refreshCalls,0,'Web opened result has no confirmed return or completed payment');
const opened=render(fundingArgs);checkBalances(opened).props.onPress();assert.equal(refreshCalls,1,'Manual read-only balance check remains available on web');
assert.equal(shortage.ready,false);

resetHooks();browserFailure=true;
addFunds(render(fundingArgs)).props.onPress();await drain();
assert.equal(fundingCalls,1);assert.equal(refreshCalls,0,'A browser launch error must not imply payment or change ledger state');
const failed=render(fundingArgs);
assert.ok(failed.some(n=>n.props?.accessibilityRole==='alert'&&JSON.stringify(n).includes('Your return and allocation are saved here')),'A safe accessible error preserves the return and explains retry');
assert.equal(addFunds(failed).props.disabled,false,'Funding can be retried after launch failure');
assert.equal(shortage.totalShortfall,100);

resetHooks();
const disabled=render({...fundingArgs,disabled:true});assert.equal(addFunds(disabled).props.disabled,true);
addFunds(disabled).props.onPress();await drain();
assert.equal(browserCalls.length,0);assert.equal(fundingCalls,0);assert.equal(refreshCalls,0);
console.log('Payment screen: zero-payable ITC posting, preserved figures, exact allocations, accessible consent, funding dismiss/cancel refresh, web opened/manual refresh, launch-error recovery and disabled/busy handoff verified. No funds or GST writes.');
