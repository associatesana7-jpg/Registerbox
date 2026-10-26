import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { palette } from '@/constants/design';
import {
  controlCenterRequest,
  createControlCenterDocumentLink,
  loadControlCenterDirectory,
  sendControlCenterOtp,
  signOutControlCenter,
  verifyControlCenterOtp,
  type ControlCenterDashboard,
  type ControlCenterDirectory,
  type ControlCenterDirectoryRow,
  type ControlCenterSection,
  type ControlCenterStaff,
} from '@/lib/control-center-api';
import { supabase } from '@/lib/supabase';
import { AdminFilingWorkspace } from '@/components/admin-filing-workspace';
import { AdminClientRegister } from '@/components/admin-client-register';
import { AdminPayments } from '@/components/admin-payments';
import { AdminWebsiteLeads } from '@/components/admin-website-leads';
import { Link } from 'expo-router';
import { useAuthCaptcha } from '@/hooks/use-auth-captcha';

type AuthStep = 'checking' | 'email' | 'otp' | 'dashboard';

type NavigationSection = 'overview' | 'client-register' | 'website-leads' | ControlCenterSection;

const navigation: { group: string; items: { label: string; icon: string; section?: NavigationSection }[] }[] = [
  { group: 'WORKSPACE', items: [
    { label:'Website enquiries', icon:'↗', section:'website-leads' },
    { label:'Clients & renewals', icon:'◷', section:'client-register' },
    { label:'Overview', icon:'⌂', section:'overview' }, { label:'Customers', icon:'◎', section:'customers' },
    { label:'Businesses', icon:'▣', section:'businesses' }, { label:'Business Intents', icon:'◇', section:'intents' },
  ] },
  { group: 'OPERATIONS', items: [
    { label:'Application Drafts', icon:'▤', section:'drafts' },
    { label:'Applications', icon:'▤', section:'applications' }, { label:'Registrations & Licences', icon:'✓', section:'licenses' },
    { label:'Customer Actions', icon:'◎', section:'actions' },
    { label:'Government Queries', icon:'⚑', section:'queries' }, { label:'Exceptions', icon:'!', section:'exceptions' }, { label:'SLA Queue', icon:'◷', section:'sla' },
  ] },
  { group: 'CONTROL', items: [
    { label:'Documents', icon:'▧', section:'documents' }, { label:'Groq AI Center', icon:'✦', section:'ai' },
    { label:'Integrations', icon:'⌁', section:'integrations' }, { label:'Payments & recovery', icon:'₹', section:'finance' }, { label:'Audit Logs', icon:'◉', section:'audit' }, { label:'Staff Access', icon:'⌾', section:'security' },
    { label:'Notification Jobs', icon:'◷', section:'notifications' },
  ] },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function humanStatus(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function slaLabel(value: string | null, referenceTime: number) {
  if (!value) return 'Not set';
  const minutes = Math.round((new Date(value).getTime() - referenceTime) / 60000);
  if (minutes < 0) return `${Math.abs(Math.round(minutes / 60))}h overdue`;
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.round(minutes / 60)}h left`;
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return <View style={styles.brand}><LinearGradient colors={['#4C8DFF','#0865F7']} style={styles.brandLogo}><Text style={styles.brandGlyph}>R</Text></LinearGradient><View><Text style={[styles.brandName,inverse && styles.textWhite]}>RegisterBox</Text><Text style={[styles.brandProduct,inverse && styles.textSoft]}>CONTROL CENTER</Text></View></View>;
}

function AuthCard({ step, email, otp, busy, error, onEmail, onOtp, onSend, onVerify }: {
  step: AuthStep; email: string; otp: string; busy: boolean; error: string;
  onEmail: (value: string) => void; onOtp: (value: string) => void; onSend: () => void; onVerify: () => void;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 850;
  return <ScrollView contentContainerStyle={styles.authPage}>
    <View style={styles.authGlowOne}/><View style={styles.authGlowTwo}/>
    <View style={styles.authHeader}><BrandMark/><View style={styles.securePill}><Text style={styles.secureDot}>●</Text><Text style={styles.secureText}>STAFF-ONLY ACCESS</Text></View></View>
    <View style={[styles.authBody,narrow&&styles.authBodyNarrow]}>
      <View style={[styles.authIntro,narrow&&styles.authIntroNarrow]}><Text style={styles.authEyebrow}>REGISTERBOX OPERATIONS</Text><Text style={[styles.authTitle,narrow&&styles.authTitleNarrow]}>Run the business with clarity.</Text><Text style={styles.authSubtitle}>One secure command center for applications, compliance, customers, AI operations and system health.</Text>
        <View style={styles.trustList}>{[['✓','Database-backed RBAC'],['✓','Audited staff actions'],['✓','PII-minimized dashboards']].map(([icon,label])=><View key={label} style={styles.trustItem}><Text style={styles.trustIcon}>{icon}</Text><Text style={styles.trustText}>{label}</Text></View>)}</View>
      </View>
      <View style={styles.authCard}>
        <View style={styles.authIcon}><Text style={styles.authIconText}>⌁</Text></View>
        <Text style={styles.authCardTitle}>{step === 'otp' ? 'Check your inbox' : 'Staff sign in'}</Text>
        <Text style={styles.authCardText}>{step === 'otp' ? `Enter the one-time code sent to ${email}.` : 'Use your authorised RegisterBox email. We will send a one-time code—there is no reusable admin password.'}</Text>
        {step === 'otp' ? <>
          <Text style={styles.fieldLabel}>6-DIGIT ONE-TIME CODE</Text>
          <TextInput accessibilityLabel="Admin one-time code" value={otp} onChangeText={(value)=>onOtp(value.replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" textContentType="oneTimeCode" autoFocus placeholder="000000" placeholderTextColor="#9AA8BF" style={[styles.authInput,styles.otpField]}/>
          <PrimaryButton label="Verify & open Control Center" busy={busy} disabled={otp.length !== 6} onPress={onVerify}/>
          <Pressable onPress={onSend} disabled={busy}><Text style={styles.authLink}>Send a new code</Text></Pressable>
        </> : <>
          <Text style={styles.fieldLabel}>AUTHORISED EMAIL</Text>
          <TextInput accessibilityLabel="Admin email" value={email} onChangeText={onEmail} keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} placeholder="name@registerbox.in" placeholderTextColor="#9AA8BF" style={styles.authInput}/>
          <PrimaryButton label="Send secure code" busy={busy} disabled={!email.includes('@')} onPress={onSend}/>
        </>}
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
        <View style={styles.authFoot}><Text style={styles.lock}>▣</Text><Text style={styles.authFootText}>Access is checked server-side on every request. Failed or unauthorised access is not upgraded by this screen.</Text></View>
      </View>
    </View>
    <Text style={styles.authLegal}>RegisterBox Control Center · Production · Access is monitored</Text>
  </ScrollView>;
}

function PrimaryButton({ label, busy, disabled, onPress }: { label: string; busy?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress} style={({pressed})=>[styles.primaryWrap,(busy||disabled)&&styles.disabled,pressed&&styles.pressed]}><LinearGradient colors={['#2C7BFF','#0865F7']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.primaryButton}>{busy?<ActivityIndicator color="#fff"/>:<><Text style={styles.primaryText}>{label}</Text><Text style={styles.primaryArrow}>→</Text></>}</LinearGradient></Pressable>;
}

function Sidebar({ compact, active, onSelect }: { compact: boolean; active: NavigationSection; onSelect: (section: NavigationSection) => void }) {
  return <View style={[styles.sidebar,compact&&styles.sidebarCompact]}>
    <BrandMark inverse/>
    <ScrollView style={styles.navScroll}>{navigation.map((group)=><View key={group.group} style={styles.navGroup}><Text style={[styles.navGroupLabel,compact&&styles.hidden]}>{group.group}</Text>{group.items.map((item)=>{const selected=item.section===active;return <Pressable key={item.label} accessibilityLabel={item.label} accessibilityRole="button" accessibilityState={{selected,disabled:!item.section}} disabled={!item.section} onPress={()=>item.section&&onSelect(item.section)} style={({pressed})=>[styles.navItem,selected&&styles.navItemActive,!item.section&&styles.navItemFuture,pressed&&styles.navItemPressed]}><Text style={[styles.navIcon,selected&&styles.navIconActive]}>{item.icon}</Text>{!compact&&<Text style={[styles.navLabel,selected&&styles.navLabelActive]}>{item.label}</Text>}{selected&&<View style={styles.activeRail}/>}</Pressable>})}</View>)}</ScrollView>
    {!compact&&<View style={styles.sidebarFoot}><View style={styles.productionDot}/><View><Text style={styles.productionTitle}>Production</Text><Text style={styles.productionSub}>Live customer data</Text></View></View>}
  </View>;
}

function MetricCard({ label, value, detail, tone = 'blue', icon }: { label: string; value: string; detail: string; tone?: 'blue'|'amber'|'red'|'green'; icon: string }) {
  const color = { blue:'#0865F7', amber:'#C97705', red:'#D73B45', green:'#009D62' }[tone];
  const background = { blue:'#EEF5FF', amber:'#FFF6E6', red:'#FFF0F1', green:'#E9F9F1' }[tone];
  return <View style={styles.metricCard}><View style={[styles.metricIcon,{backgroundColor:background}]}><Text style={[styles.metricIconText,{color}]}>{icon}</Text></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricDetail}>{detail}</Text></View>;
}

function StatusBadge({ value }: { value: string }) {
  const urgent = value.includes('QUERY') || value.includes('RESPONSE');
  const review = value.includes('REVIEW');
  return <View style={[styles.statusBadge,urgent&&styles.statusRed,review&&styles.statusAmber]}><Text style={[styles.statusText,urgent&&styles.statusTextRed,review&&styles.statusTextAmber]}>{humanStatus(value)}</Text></View>;
}

function HealthDot({ status }: { status: string }) {
  const color = status === 'Operational' || status === 'Configured' ? '#12A66A' : status === 'Degraded' || status === 'Attention' ? '#E09216' : status === 'Manual' ? '#7A5AF8' : '#8A99B3';
  return <View style={[styles.healthDot,{backgroundColor:color}]}/>;
}

const sectionCopy: Record<ControlCenterSection, { eyebrow: string; title: string; description: string }> = {
  drafts: { eyebrow:'CUSTOMER SAVED DETAILS', title:'Application drafts', description:'Answers saved during customer onboarding, before a formal application is created.' },
  customers: { eyebrow:'CUSTOMER 360', title:'Customers', description:'Masked identity context, linked businesses and account activity.' },
  businesses: { eyebrow:'BUSINESS 360', title:'Businesses', description:'Operational records, document counts, registrations and applications.' },
  applications: { eyebrow:'APPLICATION OPERATIONS', title:'Applications', description:'Live case state, SLA, authority, progress and submission mode.' },
  documents: { eyebrow:'DOCUMENT OPERATIONS', title:'Documents', description:'Every customer upload appears here as private metadata for review.' },
  licenses: { eyebrow:'PROACTIVE COMPLIANCE', title:'Registrations & licences', description:'Verified and customer-declared registrations with renewal dates.' },
  intents: { eyebrow:'INTENT INSPECTOR', title:'Business intents', description:'Original customer requests and AI classification context.' },
  audit: { eyebrow:'SECURITY & EVIDENCE', title:'Audit log', description:'Immutable operational evidence without exposing payload contents.' },
  actions: { eyebrow:'CUSTOMER OPERATIONS', title:'Customer actions', description:'Pending uploads, confirmations, payments and customer steps.' },
  queries: { eyebrow:'GOVERNMENT OPERATIONS', title:'Government queries', description:'Query deadlines, classification and response status.' },
  sla: { eyebrow:'OPERATIONS QUEUE', title:'SLA watch', description:'Open cases overdue or due within the next four hours.' },
  ai: { eyebrow:'GROQ AI', title:'AI run history', description:'Recorded models, operations, latency and outcomes.' },
  exceptions: { eyebrow:'OPERATIONS QUEUE', title:'AI failures', description:'Failed AI runs requiring investigation. Connector failures are tracked separately.' },
  finance: { eyebrow:'FINANCE', title:'Payments', description:'Recorded payment amounts and provider status.' },
  notifications: { eyebrow:'CUSTOMER COMMUNICATION', title:'Notification jobs', description:'Queued external notifications and delivery status. Provider delivery must be configured.' },
  security: { eyebrow:'STAFF ACCESS', title:'Staff directory', description:'Current staff access status. Role changes require a separate privileged workflow.' },
  integrations: { eyebrow:'CONNECTORS', title:'GST connections', description:'Stored GST connection status. Credentials and provider payloads remain private.' },
};

function DirectoryPanel({ section, data, loading, error, query, onRetry, onOpenBusiness, onPage }: {
  section: ControlCenterSection;
  data: ControlCenterDirectory | null;
  loading: boolean;
  error: string;
  query: string;
  onRetry: () => void;
  onOpenBusiness: (businessId:string) => void;
  onPage: (page:number) => void;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < 900;
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  const copy = sectionCopy[section];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data?.rows ?? [];
    return (data?.rows ?? []).filter((row) => [row.title,row.subtitle,row.status,...row.fields.flatMap((field)=>[field.label,field.value])].join(' ').toLowerCase().includes(needle));
  }, [data, query]);
  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  const openDocument = useCallback(async(row: ControlCenterDirectoryRow)=>{
    setOpening(true);setOpenError('');
    try {
      const result=await createControlCenterDocumentLink(row.id,reason);
      await Linking.openURL(result.url);
      setReason('');
    } catch(cause) {
      setOpenError(cause instanceof Error?cause.message:'The private document could not be opened.');
    } finally { setOpening(false); }
  },[reason]);

  return <ScrollView contentContainerStyle={[styles.directoryScroll,stacked&&styles.dashboardScrollMobile]}>
    <View style={styles.directoryHeading}><View><Text style={styles.kicker}>{copy.eyebrow}</Text><Text style={styles.directoryTitle}>{copy.title}</Text><Text style={styles.dashboardSubtitle}>{copy.description}</Text></View><View style={styles.countBadge}><Text style={styles.countBadgeValue}>{data?.count??0}</Text><Text style={styles.countBadgeLabel}>VISIBLE RECORDS</Text></View></View>
    {!!error&&<View style={styles.dashboardError}><Text style={styles.dashboardErrorText}>{error}</Text><Pressable onPress={onRetry}><Text style={styles.retryText}>Try again</Text></Pressable></View>}
    {selected?.businessId&&<PrimaryButton label="Open applicant, answers & all files →" onPress={()=>onOpenBusiness(selected.businessId!)}/>}
    <View style={{flexDirection:'row',gap:12,marginVertical:12}}><Pressable disabled={!data?.page||loading} onPress={()=>onPage((data?.page||0)-1)}><Text>← Previous</Text></Pressable><Text>Page {(data?.page||0)+1} · Search covers this page</Text><Pressable disabled={!data?.hasMore||loading} onPress={()=>onPage((data?.page||0)+1)}><Text>Next →</Text></Pressable></View>
    {loading?<View style={styles.directoryLoading}><ActivityIndicator color={palette.blue}/><Text style={styles.directoryLoadingText}>Loading protected records…</Text></View>:!filtered.length?<View style={styles.directoryEmpty}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>{query?'No matching records':'No records yet'}</Text><Text style={styles.emptyText}>{query?'Try a different search.':'Customer activity will appear here automatically.'}</Text></View>:<View style={[styles.directoryGrid,stacked&&styles.stack]}>
      <View style={styles.recordList}>{filtered.map((row)=><Pressable key={row.id} onPress={()=>{setSelectedId(row.id);setReason('');setOpenError('')}} style={({pressed})=>[styles.recordRow,selected?.id===row.id&&styles.recordRowActive,pressed&&styles.navItemPressed]}><View style={styles.recordIcon}><Text style={styles.recordIconText}>{row.kind==='Document'?'▧':row.kind==='Customer'?'◎':row.kind==='Business'?'▣':'▤'}</Text></View><View style={styles.recordMain}><View style={styles.recordTitleRow}><Text numberOfLines={1} style={styles.recordTitle}>{row.title}</Text><View style={styles.recordStatus}><Text style={styles.recordStatusText}>{humanStatus(row.status)}</Text></View></View><Text numberOfLines={2} style={styles.recordSubtitle}>{row.subtitle}</Text><Text style={styles.recordKind}>{row.kind.toUpperCase()}</Text></View></Pressable>)}</View>
      {selected&&<View style={styles.recordDetail}><View style={styles.recordDetailTop}><View><Text style={styles.panelEyebrow}>{selected.kind.toUpperCase()} RECORD</Text><Text style={styles.recordDetailTitle}>{selected.title}</Text><Text style={styles.recordDetailSubtitle}>{selected.subtitle}</Text></View><View style={styles.statusBadge}><Text style={styles.statusText}>{humanStatus(selected.status)}</Text></View></View><View style={styles.fieldGrid}>{selected.fields.map((field)=><View key={field.label} style={styles.fieldCard}><Text style={styles.fieldCardLabel}>{field.label}</Text><Text selectable style={styles.fieldCardValue}>{field.value}</Text></View>)}</View>{section==='documents'&&selected.canOpenDocument&&<View style={styles.documentAccess}><Text style={styles.documentAccessTitle}>Open private document</Text><Text style={styles.documentAccessCopy}>Enter why you need access. The reason is audited and the link expires after 60 seconds.</Text><TextInput accessibilityLabel="Document access reason" value={reason} onChangeText={setReason} maxLength={240} placeholder="Example: Verify identity evidence for the active FSSAI case" placeholderTextColor="#94A1B7" multiline style={styles.reasonInput}/><PrimaryButton label="Create secure preview link" busy={opening} disabled={reason.trim().length<12} onPress={()=>openDocument(selected)}/>{!!openError&&<Text style={styles.inlineError}>{openError}</Text>}</View>}</View>}
    </View>}
  </ScrollView>;
}

function Dashboard({ data, loading, error, onRefresh, onSignOut }: { data: ControlCenterDashboard; loading: boolean; error: string; onRefresh: () => void; onSignOut: () => void }) {
  const { width } = useWindowDimensions();
  const phone = width < 700;
  const compactSidebar = width < 1080;
  const singleColumn = width < 820;
  const [activeSection,setActiveSection]=useState<NavigationSection>('overview');
  const [filingBusiness,setFilingBusiness]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [registerRefresh,setRegisterRefresh]=useState(0);
  const [paymentRefresh,setPaymentRefresh]=useState(0);
  const [leadRefresh,setLeadRefresh]=useState(0);
  const [directoryData,setDirectoryData]=useState<ControlCenterDirectory|null>(null);
  const [directoryLoading,setDirectoryLoading]=useState(false);
  const [directoryError,setDirectoryError]=useState('');
  const directoryRequest=useRef(0);
  const [fade] = useState(() => new Animated.Value(0));
  const [translate] = useState(() => new Animated.Value(12));
  const generatedTime = useMemo(() => new Date(data.generatedAt).getTime(), [data.generatedAt]);

  const loadDirectory=useCallback(async(section: ControlCenterSection,page=0)=>{const request=++directoryRequest.current;setDirectoryLoading(true);setDirectoryError('');try{const result=await loadControlCenterDirectory(section,page);if(request===directoryRequest.current)setDirectoryData(result);}catch(cause){if(request===directoryRequest.current){setDirectoryData(null);setDirectoryError(cause instanceof Error?cause.message:'Protected records could not be loaded.')}}finally{if(request===directoryRequest.current)setDirectoryLoading(false)}},[]);
  const selectSection=useCallback((section: NavigationSection)=>{setFilingBusiness(null);setQuery('');setActiveSection(section);if(section!=='overview'&&section!=='client-register'&&section!=='website-leads'&&section!=='finance')void loadDirectory(section)},[loadDirectory]);
  const refreshCurrent=useCallback(()=>{if(activeSection==='overview')onRefresh();else if(activeSection==='client-register')setRegisterRefresh(v=>v+1);else if(activeSection==='website-leads')setLeadRefresh(v=>v+1);else if(activeSection==='finance')setPaymentRefresh(v=>v+1);else void loadDirectory(activeSection)},[activeSection,loadDirectory,onRefresh]);

  useEffect(()=>{let live=true;AccessibilityInfo.isReduceMotionEnabled().then((reduced)=>{if(!live)return;if(reduced){fade.setValue(1);translate.setValue(0);return;}Animated.parallel([Animated.timing(fade,{toValue:1,duration:420,useNativeDriver:process.env.EXPO_OS!=='web'}),Animated.timing(translate,{toValue:0,duration:420,useNativeDriver:process.env.EXPO_OS!=='web'})]).start();});return()=>{live=false}},[fade,translate]);

  const cards = [
    {label:'Active applications',value:formatNumber(data.metrics.activeApplications),detail:`${data.metrics.completedToday} completed today`,icon:'▤',tone:'blue' as const},
    {label:'Waiting for customer',value:formatNumber(data.metrics.waitingCustomer),detail:'Customer action required',icon:'◎',tone:'amber' as const},
    {label:'Needs review',value:formatNumber(data.metrics.needsReview),detail:'Ready for staff decision',icon:'✓',tone:'blue' as const},
    {label:'Government queries',value:formatNumber(data.metrics.governmentQueries),detail:'Response workflow open',icon:'⚑',tone:'red' as const},
    {label:'SLA risk',value:formatNumber(data.metrics.slaRisk),detail:'Due within four hours',icon:'◷',tone:'red' as const},
  ];

  return <View style={styles.dashboardRoot}>{!phone&&<Sidebar compact={compactSidebar} active={activeSection} onSelect={selectSection}/>}<View style={styles.main}>
    {data.staff.roles.some(role=>['SUPER_ADMIN','SECURITY_ADMIN'].includes(role))?<Link href="/privacy-operations" style={{padding:12,color:palette.blue}}>Privacy requests & grievances →</Link>:null}
    <View style={[styles.topbar,phone&&styles.topbarPhone]}>{phone?<BrandMark/>:<View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel="Search Control Center" value={query} onChangeText={setQuery} editable={activeSection!=='overview'} placeholder={activeSection==='overview'?'Choose a workspace to search records':'Search the current workspace...'} placeholderTextColor="#8C9AB3" style={styles.searchInput}/><Text style={styles.searchHint}>⌘ K</Text></View>}<Pressable accessibilityLabel="Refresh dashboard" onPress={refreshCurrent} disabled={loading||directoryLoading} style={styles.iconButton}>{loading||directoryLoading?<ActivityIndicator color={palette.blue} size="small"/>:<Text style={styles.iconButtonText}>↻</Text>}</Pressable><View style={styles.avatar}><Text style={styles.avatarText}>{data.staff.displayName.slice(0,1).toUpperCase()}</Text></View>{!phone&&<View style={styles.staffTop}><Text style={styles.staffName}>{data.staff.displayName}</Text><Text style={styles.staffRole}>{humanStatus(data.staff.roles[0]||'staff')}</Text></View>}<Pressable accessibilityLabel="Sign out" onPress={onSignOut} style={[styles.signOut,phone&&styles.signOutPhone]}><Text style={styles.signOutText}>{phone?'Exit':'Sign out'}</Text></Pressable></View>
    {phone&&<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileNavScroll} contentContainerStyle={styles.mobileNav}>{navigation.flatMap((group)=>group.items).filter((item):item is {label:string;icon:string;section:NavigationSection}=>!!item.section).map((item)=><Pressable key={item.section} onPress={()=>selectSection(item.section)} style={[styles.mobileNavItem,activeSection===item.section&&styles.mobileNavItemActive]}><Text style={[styles.mobileNavText,activeSection===item.section&&styles.mobileNavTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>}
    {filingBusiness?<AdminFilingWorkspace key={filingBusiness} businessId={filingBusiness} onBack={()=>{setFilingBusiness(null);if(activeSection!=='overview'&&activeSection!=='client-register'&&activeSection!=='website-leads'&&activeSection!=='finance')void loadDirectory(activeSection)}}/>:activeSection==='website-leads'?<AdminWebsiteLeads staff={data.staff} query={query} refreshKey={leadRefresh}/>:activeSection==='finance'?<AdminPayments staff={data.staff} query={query} refreshKey={paymentRefresh} onOpenBusiness={setFilingBusiness}/>:activeSection==='client-register'?<AdminClientRegister query={query} refreshKey={registerRefresh} onOpenBusiness={setFilingBusiness}/>:activeSection==='overview'?<ScrollView contentContainerStyle={[styles.dashboardScroll,singleColumn&&styles.dashboardScrollMobile]}>
      <Animated.View style={{opacity:fade,transform:[{translateY:translate}]}}>
        <View style={[styles.headingRow,phone&&styles.headingRowPhone]}><View><Text style={styles.kicker}>OPERATIONS COMMAND CENTER</Text><Text style={styles.dashboardTitle}>Good day, {data.staff.displayName.split(' ')[0]}.</Text><Text style={styles.dashboardSubtitle}>Here is what needs attention across RegisterBox right now.</Text></View><View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveText}>LIVE · {new Date(data.generatedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</Text></View></View>
        {!!error&&<View style={styles.dashboardError}><Text style={styles.dashboardErrorText}>{error}</Text></View>}
        <View style={styles.metrics}>{cards.map((card)=><MetricCard key={card.label} {...card}/>)}</View>
        <View style={[styles.insightGrid,singleColumn&&styles.stack]}>
          <View style={[styles.panel,styles.expiryPanel]}><View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>PROACTIVE COMPLIANCE</Text><Text style={styles.panelTitle}>Licence renewal watch</Text></View><View style={styles.automationBadge}><Text style={styles.automationText}>AUTOMATED DAILY</Text></View></View><Text style={styles.panelCopy}>Customers receive deduplicated in-app alerts at 30 days, 7 days and expiry. External channels are queued only after opt-in.</Text><View style={styles.expiryStats}><View style={styles.expiryStat}><Text style={styles.expiryNumber}>{data.metrics.expiringSoon}</Text><Text style={styles.expiryLabel}>Expiring in 30 days</Text></View><View style={styles.expiryDivider}/><View style={styles.expiryStat}><Text style={[styles.expiryNumber,{color:palette.red}]}>{data.metrics.expired}</Text><Text style={styles.expiryLabel}>Already expired</Text></View></View></View>
          <LinearGradient colors={['#0B245D','#071946']} style={[styles.panel,styles.revenuePanel]}><Text style={styles.darkEyebrow}>TODAY AT REGISTERBOX</Text><Text style={styles.revenueValue}>{formatMoney(data.metrics.revenueToday)}</Text><Text style={styles.revenueLabel}>Revenue collected today</Text><View style={styles.revenueRows}><View><Text style={styles.darkMetric}>{formatNumber(data.metrics.customers)}</Text><Text style={styles.darkMetricLabel}>Customers</Text></View><View><Text style={styles.darkMetric}>{formatNumber(data.metrics.businesses)}</Text><Text style={styles.darkMetricLabel}>Businesses</Text></View><View><Text style={styles.darkMetric}>{formatNumber(data.metrics.completedToday)}</Text><Text style={styles.darkMetricLabel}>Completed</Text></View></View></LinearGradient>
        </View>
        <View style={[styles.contentGrid,singleColumn&&styles.stack]}>
          <View style={[styles.panel,styles.queuePanel]}><View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>WORK THAT MOVES THE BUSINESS</Text><Text style={styles.panelTitle}>Priority queue</Text></View><Text style={styles.panelAction}>{data.priorityQueue.length} visible</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.table}><View style={[styles.tableRow,styles.tableHead]}>{['Application','Business','Service','Status','SLA','Owner'].map((label)=><Text key={label} style={[styles.th,label==='Application'&&styles.colApp,label==='Business'&&styles.colBusiness,label==='Service'&&styles.colService,label==='Status'&&styles.colStatus,label==='SLA'&&styles.colSla,label==='Owner'&&styles.colOwner]}>{label}</Text>)}</View>{data.priorityQueue.length?data.priorityQueue.map((item)=><View key={item.id} style={styles.tableRow}><Text style={[styles.tdStrong,styles.colApp]}>{item.reference}</Text><Text numberOfLines={1} style={[styles.td,styles.colBusiness]}>{item.business}</Text><Text numberOfLines={1} style={[styles.td,styles.colService]}>{item.service}</Text><View style={styles.colStatus}><StatusBadge value={item.status}/></View><Text style={[styles.td,item.slaDueAt&&new Date(item.slaDueAt).getTime()<generatedTime+14400000?styles.slaRisk:null,styles.colSla]}>{slaLabel(item.slaDueAt,generatedTime)}</Text><Text style={[styles.td,styles.colOwner]}>{item.owner}</Text></View>):<View style={styles.empty}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>No active applications</Text><Text style={styles.emptyText}>New operational work will appear here.</Text></View>}</View></ScrollView></View>
          <View style={[styles.panel,styles.healthPanel]}><View style={styles.panelHeader}><View><Text style={styles.panelEyebrow}>PLATFORM SIGNALS</Text><Text style={styles.panelTitle}>System health</Text></View><Text style={styles.panelAction}>Live checks</Text></View>{data.health.map((item)=><View key={item.name} style={styles.healthRow}><HealthDot status={item.status}/><View style={styles.healthCopy}><Text style={styles.healthName}>{item.name}</Text><Text style={styles.healthDetail}>{item.detail}</Text></View><Text style={styles.healthStatus}>{item.status}</Text></View>)}</View>
        </View>
        <View style={styles.securityStrip}><Text style={styles.securityIcon}>⌾</Text><View style={styles.securityCopy}><Text style={styles.securityTitle}>Security boundary active</Text><Text style={styles.securityText}>RBAC is resolved server-side. Dashboard responses exclude PAN, GSTIN, phone numbers, document paths and provider secrets.</Text></View><Text style={styles.securityRole}>{humanStatus(data.staff.roles[0]||'staff')}</Text></View>
      </Animated.View>
    </ScrollView>:<DirectoryPanel key={activeSection} section={activeSection} data={directoryData?.section===activeSection?directoryData:null} loading={directoryLoading} error={directoryError} query={query} onRetry={()=>loadDirectory(activeSection)} onOpenBusiness={setFilingBusiness} onPage={page=>loadDirectory(activeSection,page)}/>}
  </View></View>;
}

export function ControlCenter() {
  const { verify: verifyCaptcha, challenge } = useAuthCaptcha();
  const [step,setStep]=useState<AuthStep>('checking');
  const [email,setEmail]=useState('');
  const [otp,setOtp]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [dashboard,setDashboard]=useState<ControlCenterDashboard|null>(null);

  const loadDashboard=useCallback(async()=>{setBusy(true);setError('');try{const data=await controlCenterRequest<ControlCenterDashboard>('dashboard');setDashboard(data);setStep('dashboard');}catch(cause){setDashboard(null);setStep('email');setError(cause instanceof Error?cause.message:'Control Center access failed.');}finally{setBusy(false)}},[]);

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session)void loadDashboard();else setStep('email')})},[loadDashboard]);

  const send=useCallback(async()=>{setBusy(true);setError('');try{await sendControlCenterOtp(email,verifyCaptcha);setStep('otp');}catch(cause){setError(cause instanceof Error?cause.message:'The sign-in code could not be sent.');}finally{setBusy(false)}},[email,verifyCaptcha]);
  const verify=useCallback(async()=>{setBusy(true);setError('');try{await verifyControlCenterOtp(email,otp);const me=await controlCenterRequest<{staff:ControlCenterStaff}>('me');if(!me.staff.roles.length)throw new Error('No active Control Center role is assigned.');await loadDashboard();}catch(cause){await supabase.auth.signOut();setStep('otp');setError(cause instanceof Error?cause.message:'The code could not be verified.');}finally{setBusy(false)}},[email,otp,loadDashboard]);
  const signOut=useCallback(async()=>{setBusy(true);try{await signOutControlCenter();setDashboard(null);setOtp('');setStep('email');setError('');}finally{setBusy(false)}},[]);

  const content=useMemo(()=>step==='dashboard'&&dashboard?<Dashboard data={dashboard} loading={busy} error={error} onRefresh={loadDashboard} onSignOut={signOut}/>:<AuthCard step={step} email={email} otp={otp} busy={busy||step==='checking'} error={error} onEmail={setEmail} onOtp={setOtp} onSend={send} onVerify={verify}/>,[step,dashboard,busy,error,email,otp,loadDashboard,signOut,send,verify]);
  return <>{content}{challenge}</>;
}

const styles=StyleSheet.create({
  authPage:{flexGrow:1,minHeight:'100%',backgroundColor:'#F4F7FC',overflow:'hidden'},
  authGlowOne:{position:'absolute',width:520,height:520,borderRadius:260,backgroundColor:'#DCEAFF',top:-250,left:-130,opacity:.75},
  authGlowTwo:{position:'absolute',width:460,height:460,borderRadius:230,backgroundColor:'#E8E1FF',bottom:-280,right:-130,opacity:.55},
  authHeader:{minHeight:86,flexShrink:0,paddingHorizontal:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#DFE7F3',backgroundColor:'rgba(255,255,255,.72)'},
  brand:{flexDirection:'row',alignItems:'center',gap:11},
  brandLogo:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',boxShadow:'0 8px 20px rgba(8,101,247,.22)'},
  brandGlyph:{color:'#fff',fontSize:19,fontWeight:'900'},
  brandName:{color:'#0A1943',fontSize:18,fontWeight:'900',letterSpacing:-.4},
  brandProduct:{color:'#6D7D9A',fontSize:8,fontWeight:'900',letterSpacing:1.4,marginTop:1},
  textWhite:{color:'#fff'},
  textSoft:{color:'#8FA5D4'},
  securePill:{flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:'#D8E4F5',backgroundColor:'#fff',borderRadius:999,paddingHorizontal:12,paddingVertical:7},
  secureDot:{fontSize:8,color:'#009D62'},
  secureText:{fontSize:9,fontWeight:'900',color:'#526583',letterSpacing:.8},
  authBody:{flexGrow:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:80,paddingHorizontal:28,paddingVertical:56},
  authBodyNarrow:{flexDirection:'column',gap:32,paddingVertical:40},
  authIntro:{width:'100%',maxWidth:480},
  authIntroNarrow:{maxWidth:440},
  authEyebrow:{fontSize:11,fontWeight:'900',color:'#0865F7',letterSpacing:1.5,marginBottom:17},
  authTitle:{fontSize:46,lineHeight:51,fontWeight:'900',letterSpacing:-1.8,color:'#071946',maxWidth:450},
  authTitleNarrow:{fontSize:34,lineHeight:39},
  authSubtitle:{fontSize:16,lineHeight:26,color:'#657692',maxWidth:450,marginTop:18},
  trustList:{gap:12,marginTop:28},
  trustItem:{flexDirection:'row',alignItems:'center',gap:10},
  trustIcon:{width:23,height:23,borderRadius:12,textAlign:'center',lineHeight:23,backgroundColor:'#E7F8F0',color:'#009D62',fontWeight:'900',fontSize:11},
  trustText:{fontSize:13,fontWeight:'700',color:'#415474'},
  authCard:{width:'100%',maxWidth:440,borderWidth:1,borderColor:'#DDE7F5',borderRadius:24,backgroundColor:'#fff',padding:34,boxShadow:'0 24px 70px rgba(15,45,101,.13)'},
  authIcon:{width:50,height:50,borderRadius:15,backgroundColor:'#ECF4FF',alignItems:'center',justifyContent:'center',marginBottom:22},
  authIconText:{fontSize:25,color:'#0865F7',fontWeight:'800'},
  authCardTitle:{fontSize:25,fontWeight:'900',letterSpacing:-.7,color:'#0A1943'},
  authCardText:{fontSize:13,lineHeight:20,color:'#6C7D98',marginTop:9,marginBottom:24},
  fieldLabel:{fontSize:9,fontWeight:'900',color:'#526583',letterSpacing:1,marginBottom:8},
  authInput:{height:52,borderWidth:1,borderColor:'#CCD9EC',borderRadius:12,paddingHorizontal:15,color:'#0A1943',fontSize:14,backgroundColor:'#FBFCFF',marginBottom:14},
  otpField:{fontSize:23,fontWeight:'800',letterSpacing:9,textAlign:'center'},
  primaryWrap:{borderRadius:12,overflow:'hidden',marginTop:2},
  primaryButton:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18},
  primaryText:{color:'#fff',fontSize:13,fontWeight:'900'},
  primaryArrow:{color:'#fff',fontSize:21},
  disabled:{opacity:.48},
  pressed:{opacity:.84,transform:[{scale:.995}]},
  authLink:{textAlign:'center',color:'#0865F7',fontSize:12,fontWeight:'800',paddingTop:17},
  errorBox:{marginTop:15,padding:12,borderWidth:1,borderColor:'#FFD4D8',borderRadius:10,backgroundColor:'#FFF2F3'},
  errorText:{fontSize:12,lineHeight:18,color:'#B72F3A',fontWeight:'700'},
  authFoot:{marginTop:22,paddingTop:18,borderTopWidth:1,borderTopColor:'#E8EDF5',flexDirection:'row',gap:10},
  lock:{color:'#597098',fontSize:16},
  authFootText:{flex:1,color:'#7A88A1',fontSize:10,lineHeight:16},
  authLegal:{textAlign:'center',color:'#8A98AF',fontSize:10,padding:22},
  dashboardRoot:{flex:1,flexDirection:'row',backgroundColor:'#F4F7FB'},
  sidebar:{width:238,backgroundColor:'#071946',paddingHorizontal:18,paddingTop:24,paddingBottom:18},
  sidebarCompact:{width:76,paddingHorizontal:10},
  navScroll:{flex:1,marginTop:30},
  navGroup:{gap:4,marginBottom:19},
  navGroupLabel:{fontSize:8,fontWeight:'900',letterSpacing:1.5,color:'#647BAE',paddingHorizontal:11,marginBottom:7},
  hidden:{opacity:0},
  navItem:{height:40,borderRadius:10,flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:11,position:'relative'},
  navItemActive:{backgroundColor:'#12366E'},
  navItemFuture:{opacity:.42},
  navItemPressed:{opacity:.72},
  navIcon:{width:20,textAlign:'center',color:'#8297C4',fontSize:15},
  navIconActive:{color:'#68A3FF'},
  navLabel:{color:'#AEBDE0',fontSize:11,fontWeight:'700'},
  navLabelActive:{color:'#fff',fontWeight:'800'},
  activeRail:{position:'absolute',right:-18,width:3,height:18,borderRadius:2,backgroundColor:'#4C8DFF'},
  sidebarFoot:{borderTopWidth:1,borderTopColor:'#18346D',paddingTop:16,flexDirection:'row',alignItems:'center',gap:10},
  productionDot:{width:8,height:8,borderRadius:4,backgroundColor:'#1CC47B',boxShadow:'0 0 10px rgba(28,196,123,.8)'},
  productionTitle:{color:'#fff',fontWeight:'800',fontSize:10},
  productionSub:{color:'#7188B8',fontSize:8,marginTop:2},
  main:{flex:1,minWidth:0},
  topbar:{height:76,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#E2E8F2',flexDirection:'row',alignItems:'center',paddingHorizontal:24,gap:12},
  topbarPhone:{height:70,paddingHorizontal:12,gap:8,justifyContent:'space-between'},
  search:{height:42,flex:1,maxWidth:560,borderWidth:1,borderColor:'#DCE4F0',borderRadius:11,backgroundColor:'#F8FAFD',flexDirection:'row',alignItems:'center',paddingHorizontal:12},
  searchIcon:{fontSize:19,color:'#71809B'},
  searchInput:{flex:1,height:40,paddingHorizontal:10,fontSize:12,color:'#0A1943'},
  searchHint:{fontSize:9,fontWeight:'800',color:'#8A99B3',borderWidth:1,borderColor:'#D7DFEA',borderRadius:5,paddingHorizontal:6,paddingVertical:3},
  iconButton:{width:39,height:39,borderRadius:10,borderWidth:1,borderColor:'#E0E7F1',alignItems:'center',justifyContent:'center'},
  iconButtonText:{color:'#526583',fontSize:19},
  avatar:{width:36,height:36,borderRadius:10,backgroundColor:'#EAF3FF',alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#0865F7',fontWeight:'900',fontSize:14},
  staffTop:{minWidth:104},
  staffName:{color:'#0A1943',fontSize:11,fontWeight:'800'},
  staffRole:{color:'#7A89A1',fontSize:8,marginTop:2},
  signOut:{paddingHorizontal:10,paddingVertical:8},
  signOutPhone:{paddingHorizontal:4},
  signOutText:{fontSize:10,fontWeight:'800',color:'#617399'},
  dashboardScroll:{padding:28,maxWidth:1500,width:'100%',alignSelf:'center'},
  dashboardScrollMobile:{padding:16},
  headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,gap:20},
  headingRowPhone:{flexDirection:'column',gap:12},
  kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.3,color:'#0865F7'},
  dashboardTitle:{fontSize:27,lineHeight:34,fontWeight:'900',letterSpacing:-.8,color:'#0A1943',marginTop:7},
  dashboardSubtitle:{fontSize:12,color:'#71809A',marginTop:5},
  liveBadge:{flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:'#DCE6F2',borderRadius:999,backgroundColor:'#fff',paddingHorizontal:11,paddingVertical:7},
  liveDot:{width:7,height:7,borderRadius:4,backgroundColor:'#00A568'},
  liveText:{fontSize:8,color:'#617392',fontWeight:'900',letterSpacing:.7},
  dashboardError:{padding:12,borderRadius:10,backgroundColor:'#FFF1F2',borderWidth:1,borderColor:'#FFD9DC',marginBottom:18},
  dashboardErrorText:{fontSize:11,color:'#B72F3A',fontWeight:'700'},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:16},
  metricCard:{flexGrow:1,flexBasis:170,minWidth:150,backgroundColor:'#fff',borderWidth:1,borderColor:'#E1E7F0',borderRadius:16,padding:16,boxShadow:'0 5px 18px rgba(20,50,100,.045)'},
  metricIcon:{width:32,height:32,borderRadius:9,alignItems:'center',justifyContent:'center',marginBottom:13},
  metricIconText:{fontWeight:'900',fontSize:15},
  metricValue:{fontSize:25,fontWeight:'900',letterSpacing:-.6,color:'#0A1943'},
  metricLabel:{fontSize:10,fontWeight:'800',color:'#405371',marginTop:3},
  metricDetail:{fontSize:8.5,color:'#8A99AF',marginTop:5},
  insightGrid:{flexDirection:'row',gap:16,marginBottom:16},
  stack:{flexDirection:'column'},
  panel:{backgroundColor:'#fff',borderWidth:1,borderColor:'#E0E7F0',borderRadius:17,padding:19,boxShadow:'0 5px 20px rgba(20,50,100,.04)'},
  expiryPanel:{flex:1.45},
  panelHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},
  panelEyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1.15,color:'#0865F7'},
  panelTitle:{fontSize:16,fontWeight:'900',color:'#0A1943',letterSpacing:-.35,marginTop:5},
  automationBadge:{backgroundColor:'#E8F8F0',borderRadius:999,paddingHorizontal:9,paddingVertical:5},
  automationText:{fontSize:7,fontWeight:'900',color:'#008E59',letterSpacing:.65},
  panelCopy:{fontSize:10,lineHeight:16,color:'#71809A',marginTop:13,maxWidth:560},
  expiryStats:{flexDirection:'row',alignItems:'center',marginTop:18,paddingTop:16,borderTopWidth:1,borderTopColor:'#E8EDF4'},
  expiryStat:{flex:1},
  expiryNumber:{fontSize:25,fontWeight:'900',color:'#C97705'},
  expiryLabel:{fontSize:9,color:'#71819B',marginTop:3},
  expiryDivider:{width:1,height:36,backgroundColor:'#E3E9F1',marginHorizontal:18},
  revenuePanel:{flex:1,borderWidth:0},
  darkEyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:'#81AEFF'},
  revenueValue:{fontSize:28,fontWeight:'900',color:'#fff',marginTop:9,letterSpacing:-.7},
  revenueLabel:{fontSize:9,color:'#91A6D2',marginTop:3},
  revenueRows:{flexDirection:'row',gap:28,marginTop:19,paddingTop:15,borderTopWidth:1,borderTopColor:'#1B3973'},
  darkMetric:{fontSize:15,fontWeight:'900',color:'#fff'},
  darkMetricLabel:{fontSize:8,color:'#8198C6',marginTop:3},
  contentGrid:{flexDirection:'row',gap:16},
  queuePanel:{flex:2,minWidth:0},
  healthPanel:{flex:1,minWidth:280},
  panelAction:{fontSize:9,fontWeight:'800',color:'#0865F7'},
  table:{minWidth:760,marginTop:15},
  tableRow:{minHeight:50,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#ECF0F5'},
  tableHead:{minHeight:34,backgroundColor:'#F7F9FC',borderBottomWidth:0,borderRadius:8},
  th:{fontSize:8,fontWeight:'900',letterSpacing:.55,color:'#71809A',paddingHorizontal:9},
  td:{fontSize:9.5,color:'#566985',paddingHorizontal:9},
  tdStrong:{fontSize:9.5,fontWeight:'900',color:'#0A1943',paddingHorizontal:9},
  colApp:{width:112},
  colBusiness:{width:145},
  colService:{width:145},
  colStatus:{width:140},
  colSla:{width:100},
  colOwner:{width:105},
  statusBadge:{alignSelf:'flex-start',backgroundColor:'#EDF4FF',borderRadius:999,paddingHorizontal:8,paddingVertical:5},
  statusText:{fontSize:7,fontWeight:'900',color:'#0865F7'},
  statusRed:{backgroundColor:'#FFF0F1'},
  statusTextRed:{color:'#D73B45'},
  statusAmber:{backgroundColor:'#FFF5E3'},
  statusTextAmber:{color:'#C97705'},
  slaRisk:{color:'#D73B45',fontWeight:'900'},
  empty:{alignItems:'center',paddingVertical:32},
  emptyIcon:{fontSize:18,color:'#009D62'},
  emptyTitle:{fontSize:12,fontWeight:'900',color:'#0A1943',marginTop:7},
  emptyText:{fontSize:9,color:'#8A99AF',marginTop:4},
  healthRow:{minHeight:62,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#ECF0F5',gap:10},
  healthDot:{width:8,height:8,borderRadius:4},
  healthCopy:{flex:1},
  healthName:{fontSize:10,fontWeight:'800',color:'#0A1943'},
  healthDetail:{fontSize:8,lineHeight:12,color:'#8694AA',marginTop:3},
  healthStatus:{fontSize:8,fontWeight:'900',color:'#526583'},
  securityStrip:{marginTop:16,borderWidth:1,borderColor:'#DCE5F1',backgroundColor:'#F9FBFE',borderRadius:14,padding:15,flexDirection:'row',alignItems:'center',gap:12},
  securityIcon:{fontSize:20,color:'#0865F7'},
  securityCopy:{flex:1},
  securityTitle:{fontSize:10,fontWeight:'900',color:'#0A1943'},
  securityText:{fontSize:8.5,lineHeight:13,color:'#75849B',marginTop:2},
  securityRole:{fontSize:8,fontWeight:'900',color:'#0865F7',backgroundColor:'#EAF3FF',borderRadius:999,paddingHorizontal:9,paddingVertical:6},
  mobileNavScroll:{flexGrow:0,flexShrink:0,width:'100%',maxHeight:52,overflow:'hidden'},
  mobileNav:{alignItems:'center',paddingHorizontal:12,paddingVertical:9,gap:7,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#E4EAF3'},
  mobileNavItem:{borderRadius:999,paddingHorizontal:12,paddingVertical:7,backgroundColor:'#F2F5FA'},
  mobileNavItemActive:{backgroundColor:'#0B3370'},
  mobileNavText:{fontSize:9,fontWeight:'800',color:'#657692'},
  mobileNavTextActive:{color:'#fff'},
  directoryScroll:{padding:28,maxWidth:1500,width:'100%',alignSelf:'center'},
  directoryHeading:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start',gap:18,marginBottom:22},
  directoryTitle:{fontSize:28,lineHeight:35,fontWeight:'900',letterSpacing:-.8,color:'#0A1943',marginTop:7},
  countBadge:{minWidth:86,alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:'#DCE5F1',borderRadius:14,paddingHorizontal:14,paddingVertical:10},
  countBadgeValue:{fontSize:20,fontWeight:'900',color:'#0865F7'},
  countBadgeLabel:{fontSize:7,fontWeight:'900',letterSpacing:.6,color:'#7C8CA6',marginTop:2},
  retryText:{fontSize:10,fontWeight:'900',color:'#0865F7',marginTop:8},
  directoryLoading:{minHeight:320,alignItems:'center',justifyContent:'center',gap:12},
  directoryLoadingText:{fontSize:11,color:'#71809A'},
  directoryEmpty:{minHeight:320,backgroundColor:'#fff',borderWidth:1,borderColor:'#E1E7F0',borderRadius:18,alignItems:'center',justifyContent:'center'},
  directoryGrid:{flexDirection:'row',gap:16,alignItems:'stretch'},
  recordList:{flex:1,minWidth:0,gap:9},
  recordRow:{flexDirection:'row',gap:12,alignItems:'flex-start',padding:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#E0E7F0',borderRadius:14},
  recordRowActive:{borderColor:'#6FA7FF',backgroundColor:'#F7FAFF',boxShadow:'0 6px 20px rgba(8,101,247,.08)'},
  recordIcon:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#EDF4FF'},
  recordIconText:{color:'#0865F7',fontSize:16,fontWeight:'900'},
  recordMain:{flex:1,minWidth:0},
  recordTitleRow:{flexDirection:'row',alignItems:'center',gap:8},
  recordTitle:{flex:1,fontSize:12,fontWeight:'900',color:'#0A1943'},
  recordSubtitle:{fontSize:9.5,lineHeight:14,color:'#71809A',marginTop:4},
  recordKind:{fontSize:7,fontWeight:'900',letterSpacing:.8,color:'#8B99AE',marginTop:7},
  recordStatus:{backgroundColor:'#EBF3FF',borderRadius:999,paddingHorizontal:7,paddingVertical:4},
  recordStatusText:{fontSize:7,fontWeight:'900',color:'#0865F7'},
  recordDetail:{flex:1.15,minWidth:0,backgroundColor:'#fff',borderWidth:1,borderColor:'#DFE7F1',borderRadius:18,padding:22},
  recordDetailTop:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start',gap:12,paddingBottom:18,borderBottomWidth:1,borderBottomColor:'#E9EDF4'},
  recordDetailTitle:{fontSize:20,fontWeight:'900',color:'#0A1943',letterSpacing:-.45,marginTop:6},
  recordDetailSubtitle:{fontSize:10,color:'#71809A',marginTop:5},
  fieldGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:18},
  fieldCard:{flexBasis:150,flexGrow:1,minHeight:66,backgroundColor:'#F7F9FC',borderRadius:11,padding:12},
  fieldCardLabel:{fontSize:8,fontWeight:'900',letterSpacing:.55,color:'#7D8CA3'},
  fieldCardValue:{fontSize:11,fontWeight:'800',color:'#203453',marginTop:7},
  documentAccess:{marginTop:20,paddingTop:19,borderTopWidth:1,borderTopColor:'#E6EBF2'},
  documentAccessTitle:{fontSize:13,fontWeight:'900',color:'#0A1943'},
  documentAccessCopy:{fontSize:9.5,lineHeight:15,color:'#71809A',marginTop:5,marginBottom:12},
  reasonInput:{minHeight:74,borderWidth:1,borderColor:'#CCD9EC',borderRadius:11,padding:12,color:'#0A1943',fontSize:11,backgroundColor:'#FBFCFF',textAlignVertical:'top',marginBottom:10},
  inlineError:{fontSize:10,lineHeight:15,color:'#B72F3A',fontWeight:'700',marginTop:10},
});
