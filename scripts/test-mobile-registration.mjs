import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const jsx=(type,props)=>({type,props});
function load(file,modules={}){
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,process:{env:{EXPO_OS:'web'}},require(name){if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name in modules)return modules[name];throw Error(`Unexpected dependency: ${name}`);}});
  return exports;
}
function nodes(tree){return Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];}
const presentation=load('src/lib/application-form-presentation.ts');
assert.equal(presentation.applicationInputProps({key:'contact_email'}).keyboardType,'email-address');
assert.equal(presentation.applicationInputProps({key:'contact_mobile'}).maxLength,10);
assert.equal(presentation.applicationInputProps({key:'director_1_pan'}).autoCapitalize,'characters');
assert.equal(presentation.applicationInputProps({key:'director_1_din'}).keyboardType,'number-pad');
assert.equal(presentation.applicationInputProps({key:'amount',numeric:true}).keyboardType,'decimal-pad');
assert.equal(presentation.applicationInputProps({key:'count',numeric:true,integer:true}).keyboardType,'number-pad');
assert.equal(presentation.applicationInputProps({key:'activity'}).multiline,true);
assert.equal(presentation.applicationPhase(0,8,9),0);
assert.equal(presentation.applicationPhase(5,8,9),1);
assert.equal(presentation.applicationPhase(8,8,9),2);
assert.equal(presentation.applicationPhase(9,8,9),3);

const palette=load('src/constants/design.ts');
const rn={StyleSheet:{create:value=>value,absoluteFill:{}},Platform:{OS:'ios'},useWindowDimensions:()=>({width:390,height:844})};
for(const type of ['ActivityIndicator','KeyboardAvoidingView','Modal','Pressable','ScrollView','Text','TextInput','View'])rn[type]=type;
const hooks=()=>{const values=[];let cursor=0;return {reset(){cursor=0;},react:{useState(initial){const index=cursor++;if(!(index in values))values[index]=initial;return [values[index],value=>{values[index]=typeof value==='function'?value(values[index]):value;}];}}};};
const form=load('src/components/application-form-ui.tsx',{'react-native':rn,'@/constants/design':palette,'@/lib/application-form-presentation':presentation});
let selected='';
const choices=nodes(form.ApplicationChoices({options:['Owned','Rented'],value:'Rented',disabled:false,onChange:value=>{selected=value;}})).filter(n=>n.props?.accessibilityRole==='radio');
assert.equal(choices.length,2);assert.equal(choices[1].props.accessibilityState.checked,true);choices[0].props.onPress();assert.equal(selected,'Owned');
const footer=nodes(form.ApplicationFooter({title:'Send to RegisterBox',busy:true,disabled:false,review:true,onContinue(){},onBack(){}}));
assert.ok(footer.some(n=>n.props?.children==='Sending to RegisterBox…'));
const actions=footer.filter(n=>n.type==='Pressable');assert.ok(actions.every(n=>n.props.disabled));
const progress=nodes(form.ApplicationProgress({step:2,documentStep:8,reviewStep:9})).find(n=>n.props?.accessibilityRole==='progressbar');
assert.equal(progress.props.accessibilityValue.now,2);assert.equal(progress.props.accessibilityValue.text,'Details');

const uiHooks=hooks();
const ui=load('src/components/registerbox-ui.tsx',{'react':uiHooks.react,'react-native':rn,'expo-linear-gradient':{LinearGradient:'LinearGradient'},'expo-image':{Image:'Image'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:34,left:0,right:0})},'@/constants/design':palette});
uiHooks.reset();const field=nodes(ui.Field({label:'Business name'})).find(n=>n.type==='TextInput');assert.equal(field.props.accessibilityLabel,'Business name');assert.equal(field.props.style[0].fontSize,16);
uiHooks.reset();let screen=ui.Screen({children:'question',footer:'continue'});assert.equal(screen.type,'KeyboardAvoidingView');assert.equal(screen.props.behavior,'padding');
nodes(screen).find(n=>n.props?.onLayout).props.onLayout({nativeEvent:{layout:{height:164}}});
uiHooks.reset();screen=ui.Screen({children:'question',footer:'continue'});const scroll=nodes(screen).find(n=>n.type==='ScrollView');assert.equal(scroll.props.contentContainerStyle[1].paddingBottom,188);assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');
const button=ui.Button({title:'Save & continue',disabled:true});assert.equal(button.props.accessibilityRole,'button');assert.equal(button.props.accessibilityState.disabled,true);

const selectHooks=hooks();
const select=load('src/components/gst-ui.tsx',{'react':selectHooks.react,'react-native':rn,'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:34})},'@/constants/design':palette}).GstSelect;
const options=Array.from({length:20},(_,i)=>({label:`Option ${i+1}`,value:String(i+1)}));
selectHooks.reset();let tree=select({label:'Choose a number',value:'2',options,onChange(){}});let list=nodes(tree);assert.equal(list.find(n=>n.type==='Modal').props.animationType,'none');
const search=list.find(n=>n.type==='TextInput');assert.equal(search.props.style.fontSize,16);search.props.onChangeText('Option 20');
selectHooks.reset();tree=select({label:'Choose a number',value:'2',options,onChange(){}});assert.equal(nodes(tree).filter(n=>n.props?.accessibilityRole==='radio').length,1);
const categories=load('src/data/application-categories.ts');
for(const key of Object.keys(categories.applicationCategories)){
  assert.ok(Array.isArray(categories.questionsFor(key,{})));
  assert.ok(Array.isArray(categories.documentsFor(key,{})));
}
assert.notEqual(categories.validateQuestion({key:'contact_email',label:'Email',pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'},{contact_email:'not-an-email'}),'');
assert.equal(categories.validateQuestion({key:'contact_email',label:'Email',pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'},{contact_email:'qa@example.com'}),'');
console.log('Passed: mobile keyboards, 4-stage progress, selectable choices, busy/disabled controls, measured footer spacing, searchable modal, and all questionnaire categories. No backend calls.');

// Exercise the real application component with inert hooks and no database methods.
// Any accidental backend invocation during these render tests throws immediately.
let requested='gst_registration';
let signedIn=true;
let overrides={};
let hookIndex=0;
const application=load('src/app/onboarding/application.tsx',{
  'expo-router':{Redirect:'Redirect',router:{back(){},replace(){}},useLocalSearchParams:()=>({category:requested})},
  react:{useEffect(){},useRef:value=>({current:value}),useState(initial){const index=hookIndex++;return [Object.hasOwn(overrides,index)?overrides[index]:initial,()=>{}];}},
  'react-native':rn,
  '@/data/application-categories':categories,
  '@/components/registerbox-ui':Object.fromEntries(['Button','Card','ErrorBanner','Field','PageHeader','Screen'].map(name=>[name,name])),
  '@/components/gst-ui':{GstSelect:'GstSelect'},
  '@/components/application-address':{ApplicationAddress:'ApplicationAddress'},
  '@/data/india-address':{validateAddress:()=>''},
  '@/components/application-form-ui':Object.fromEntries(['ApplicationChoices','ApplicationFooter','ApplicationProgress'].map(name=>[name,name])),
  '@/lib/application-form-presentation':presentation,
  '@/hooks/use-app':{useApp:()=>({session:signedIn?{user:{id:'local-render-fixture'}}:null,loadingSession:false,business:{},selectBusiness(){throw Error('Render must not mutate a business');}})},
  '@/lib/supabase':{supabase:{}},
  '@/lib/registerbox-api':{chooseAndUploadDocument(){throw Error('Render must not upload');}},
  '@/constants/design':palette,
}).default;
for(const category of Object.keys(categories.applicationCategories).filter(key=>key!=='gst')){
  requested=category;overrides={};hookIndex=0;
  const entry=application();assert.equal(typeof entry.type,'function');
  const render=(step=0)=>{overrides={3:step};hookIndex=0;return entry.type(entry.props);};
  const initial=render();const initialNodes=nodes(initial);
  assert.ok(initialNodes.some(n=>n.type==='Field'&&n.props.label==='Business name'),category);
  const progress=initialNodes.find(n=>n.type==='ApplicationProgress');
  const choices=categories.questionsFor(category,{}).findIndex(q=>q.options&&q.options.length<=6);
  if(choices>=0)assert.ok(nodes(render(choices+1)).some(n=>n.type==='ApplicationChoices'),`${category}: small choice lists should be tappable`);
  const docs=render(progress.props.documentStep);assert.ok(nodes(docs).some(n=>n.type==='Button'&&n.props.title==='Choose a document'),category);
  const review=render(progress.props.reviewStep);const finalFooter=nodes(review.props.footer).find(n=>n.type==='ApplicationFooter');
  assert.equal(finalFooter.props.title,'Send to RegisterBox');assert.equal(finalFooter.props.review,true);
  signedIn=false;const signedOut=application();assert.equal(signedOut.type,'Redirect');assert.equal(signedOut.props.href.params.next,`/onboarding/application?category=${category}`);signedIn=true;
}
requested='gst';assert.equal(application().props.href,'/gst');
console.log('Passed: every registration category renders business/details/documents/review with real existing auth destinations; no saving, uploading or submission performed.');
