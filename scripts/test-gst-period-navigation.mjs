import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {advanceTo3b} from '../src/lib/gst-period-navigation.ts';
import {gstResumeRoute,gstReconnectParams} from '../src/lib/gst-return-route.ts';
const pending={period:'092026',records:[{form:'GSTR1',status:'Not filed'}]};
const filed={period:'092026',records:[{form:'GSTR1',status:'Filed'}]};
assert.equal(advanceTo3b(null,null,false),false);
assert.equal(advanceTo3b(pending,null,false),false);
assert.equal(advanceTo3b(filed,null,false),true,'Previously filed GSTR-1 opens next step');
assert.equal(advanceTo3b(filed,pending,false),true);
assert.equal(advanceTo3b(filed,pending,true),true,'New filing advances even after manually selecting GSTR-1');
assert.equal(advanceTo3b(filed,filed,true),false,'User can inspect an already-filed GSTR-1');
assert.equal(advanceTo3b({...pending,period:'102026'},filed,false),false,'A different period starts at GSTR-1');
assert.equal(advanceTo3b({period:'092026',records:[{form:'GSTR1',status:'Submitted'}]},pending,false),false,'Only confirmed filed advances');
const source=fs.readFileSync('src/app/gst.tsx','utf8');
assert.match(source,/\[section,setSection\]=useState\(resumeReturn\?\.form==='gstr-3b'\?'GSTR-3B':'GSTR-1'\)/);
const resume={form:'gstr-3b',year:'2026',month:'08',mode:'regular'};
const route=gstReconnectParams(resume,'business');
assert.deepEqual(gstResumeRoute(route,'business'),resume);
assert.equal(gstResumeRoute(route,'other-business'),null);
assert.equal(gstResumeRoute({...route,resumeForm:['gstr-3b']},'business'),null);
assert.equal(gstResumeRoute({...route,resumeMode:'https://example.com'},'business'),null);

// Execute the real connection screen. OTP reconnection must return to the
// original business/form/period, not today's default period or a free-form URL.
{
 const state=[],effects=[],refs=[],calls=[],navigation=[];let index=0,ref=0,effect=0;
 const react={useState(initial){const i=index++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},useRef(initial){return refs[ref++]??={current:initial};},useCallback:fn=>fn,useEffect(fn){const i=effect++;if(!(i in effects))effects[i]=fn();}};
 const jsx=(type,props)=>({type,props});
 const modules={react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Text:'Text',View:'View',Pressable:'Pressable',Linking:{}},'expo-router':{Redirect:'Redirect',Stack:{Screen:'StackScreen'},router:{push:value=>navigation.push(value),replace:value=>navigation.push(value),back(){}},useLocalSearchParams:()=>route},'@/hooks/use-app':{useApp:()=>({session:{user:{id:'owner'}},business:{id:'business',gstin:'29ABCDE1234F1Z5'},loadingSession:false,demoMode:false})},'@/lib/gst-period-navigation':{advanceTo3b},'@/lib/gst-return-route':{gstResumeRoute},'@/constants/design':{palette:{}},'@/lib/gst-filing-workflow':{classifyPortalStatus:()=> 'UNKNOWN',portalStateCopy:()=>'',GST_RETURN_COVERAGE:[]},'@/lib/gst-api':{gstAction:async(_business,action,input)=>{calls.push({action,input});return{connection:{gstin:'29ABCDE1234F1Z5',username:'synthetic-user',status:action==='verify_otp'?'linked':'otp_pending',lastOtpAt:'2020-01-01T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z'}};}}};
 for(const [path,names] of Object.entries({'@/components/registerbox-ui':['Button','ErrorBanner','Field','Screen'],'@/components/gst-filing-history':['GstFilingHistory'],'@/components/gst-ui':['GstActionRow','GstHeader','GstSelect','GstTabs'],'@/components/gst-return-review':['GstReturnReview'],'@/components/business-profile-picker':['BusinessProfilePicker'],'@/components/gst-checkbox':['GstCheckbox'],'@/components/workspace-ui':['Disclosure'],'@/components/app-icon':['AppIcon']}))modules[path]=Object.fromEntries(names.map(name=>[name,name]));
 modules['@/components/gst-ui'].gstStyles={};
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('require','exports','setInterval','clearInterval',compiled)(name=>modules[name]??assert.fail(name),exports,()=>0,()=>{});
 const root=exports.default();const render=()=>{index=ref=effect=0;return root.type(root.props);};
 const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];
 render();await new Promise(resolve=>setTimeout(resolve,0));let tree=render();
 assert.ok(nodes(tree).some(node=>node.type==='Text'&&JSON.stringify(node.props.children).includes('08')));
 nodes(tree).find(node=>node.type==='Field'&&node.props.label==='6-digit GST login OTP').props.onChangeText('123456');
 nodes(tree).find(node=>typeof node.type==='function'&&node.props.label?.startsWith('Verify this OTP')).props.onChange();
 tree=render();const verify=nodes(tree).find(node=>node.type==='Button'&&node.props.title==='Verify & Link GST');assert.equal(verify.props.disabled,false);await verify.props.onPress();
 assert.deepEqual(navigation,[{pathname:'/gst-returns',params:resume}]);
 assert.deepEqual(calls.map(call=>call.action),['status','verify_otp'],'Reconnection never retries the previous GST write');
}
console.log('GST tab sequence verified: GSTR-1 by default, confirmed filing advances to GSTR-3B, new period resets, manual receipt viewing preserved.');
