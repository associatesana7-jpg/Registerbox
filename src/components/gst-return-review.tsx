import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorBanner } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import type { GstReturn } from '@/lib/gst-api';
import { buildGstReview, type ReviewSection } from '@/lib/gst-review';

const currency = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(value);
function taxTotal(section?: ReviewSection) {
  const rows = section?.rows.filter(row => /\.(iamt|camt|samt|csamt)$/.test(row.path));
  return rows?.length === 4 && rows.every(row => row.value !== null) ? rows.reduce((sum,row)=>sum+(row.value ?? 0),0) : null;
}

export function GstReturnReview({ result, onContinue }: { result: GstReturn; onContinue?: () => void }) {
  const [tab,setTab]=useState('Summary');
  const [expanded,setExpanded]=useState<string|null>(null);
  const review=buildGstReview(result.details,result.form,result.gstin,String(result.month).padStart(2,'0')+result.year);
  const output=review.identityMatches ? taxTotal(review.sections.find(section=>section.rows[0]?.path.startsWith('sup_details.osup_det.'))) : null;
  const itc=review.identityMatches ? taxTotal(review.sections.find(section=>section.rows[0]?.path.startsWith('itc_elg.itc_net.'))) : null;
  const tabs=result.form==='gstr-3b'?['Summary','Sales','ITC','Other']:['Summary','Sections'];
  const visible=review.sections.filter(section=>tab==='Sales'?section.rows[0]?.path.startsWith('sup_details.'):tab==='ITC'?section.rows[0]?.path.startsWith('itc_elg.'):tab==='Other'?section.rows[0]?.path.startsWith('intr_ltfee.'):true);
  return <View style={{gap:16}}>
    <View style={styles.tabs}>{tabs.map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:tab===value}} onPress={()=>setTab(value)} style={[styles.tab,tab===value&&styles.activeTab]}><Text style={[styles.tabText,tab===value&&styles.activeTabText]}>{value}</Text></Pressable>)}</View>
    {review.warnings.map(warning=><ErrorBanner key={warning} message={warning}/>)}
    {tab==='Summary'?<>
      <View style={styles.statusStrip}><Status label="GST data" value="Fetched" good/><Status label="Comparison" value="Review needed"/><Status label="Filing" value={result.filed?'Filed':'Not confirmed'} good={result.filed}/></View>
      <View style={styles.notice}><Text style={styles.noticeIcon}>✓</Text><View style={{flex:1}}><Text style={styles.noticeTitle}>Your GST data is ready to review</Text><Text style={styles.small}>Fetched {new Date(result.fetchedAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Text></View></View>
      {result.form==='gstr-3b'?<><View style={styles.metrics}><Metric label="Outward tax reported" value={currency(output)}/><Metric label="Net ITC reported" value={currency(itc)}/></View><View style={styles.payable}><Text style={styles.metricLabel}>Cash payable</Text><Text style={styles.payableValue}>Review payment & setoff</Text><Text style={styles.small}>Calculated after checking liabilities and ledger balances.</Text></View></>:null}
      <Text style={styles.sectionTitle}>Review checklist</Text>
      <CheckLine done={review.identityMatches} text="GSTIN and return period match"/>
      <CheckLine done={review.sections.length>0} text="Return sections received from GST"/>
      <CheckLine text="Compare invoices with your books"/>
      <CheckLine text="Confirm ITC eligibility and ledger balances"/>
      <CheckLine text="Review and authorize the final return"/>
      <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Button title="View details" variant="secondary" onPress={()=>setTab(result.form==='gstr-3b'?'Sales':'Sections')}/></View>{onContinue?<View style={{flex:1}}><Button title="Prepare return" onPress={onContinue}/></View>:null}</View>
    </>:review.identityMatches?<>
      {visible.length?visible.map((section,index)=><View key={section.title} style={styles.section}>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===section.title}} onPress={()=>setExpanded(expanded===section.title?null:section.title)} style={styles.sectionHeader}><Text style={styles.sectionTitle}>{index+1}. {section.title.replace(' · eligibility not verified','')}</Text><Text style={{color:palette.blue}}>{expanded===section.title?'⌃':'⌄'}</Text></Pressable>
        {section.rows.map(row=><View key={row.path} style={styles.row}><Text style={styles.rowLabel}>{row.label}</Text><Text selectable style={styles.rowValue}>{row.money?currency(row.value):row.value??'—'}</Text></View>)}
        {expanded===section.title?<Text selectable style={styles.small}>Source fields: {section.rows.map(row=>row.path).join(', ')}</Text>:null}
      </View>):<View style={styles.section}><Text style={styles.small}>GST did not supply these figures for this return.</Text></View>}
      <Text style={styles.small}>Reported ITC still needs an eligibility check. “—” means the figure was not supplied.</Text>
    </>:null}
  </View>;
}
function Metric({label,value}:{label:string;value:string}){return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text selectable style={styles.metricValue}>{value}</Text></View>;}
function Status({label,value,good=false}:{label:string;value:string;good?:boolean}){return <View style={styles.status}><Text style={{color:good?palette.green:palette.muted,fontSize:18}}>{good?'●':'○'}</Text><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View>;}
function CheckLine({text,done=false}:{text:string;done?:boolean}){return <View style={{flexDirection:'row',gap:9,alignItems:'center'}}><Text style={{color:done?palette.green:palette.muted,fontSize:16}}>{done?'✓':'○'}</Text><Text style={{fontSize:12,color:palette.muted,flex:1}}>{text}</Text></View>;}
const styles=StyleSheet.create({
  tabs:{flexDirection:'row',padding:4,gap:3,borderRadius:10,backgroundColor:'#EDF1F8'},tab:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:7},activeTab:{backgroundColor:palette.blue},tabText:{fontSize:11,color:palette.muted,fontWeight:'700'},activeTabText:{color:palette.white},
  statusStrip:{flexDirection:'row',borderWidth:1,borderColor:palette.line,borderRadius:12,backgroundColor:'#F6FBFA'},status:{flex:1,alignItems:'center',padding:11,gap:4},statusLabel:{fontSize:10,fontWeight:'800',color:palette.ink},statusValue:{fontSize:9,color:palette.muted},
  notice:{flexDirection:'row',gap:10,padding:13,borderRadius:10,backgroundColor:'#E5F8EE',alignItems:'center'},noticeIcon:{color:palette.green,fontSize:22},noticeTitle:{fontSize:12,fontWeight:'800',color:'#167346'},small:{fontSize:11,lineHeight:17,color:palette.muted},
  metrics:{flexDirection:'row',gap:9},metric:{flex:1,padding:14,borderRadius:12,borderWidth:1,borderColor:palette.line,backgroundColor:palette.white,gap:7},metricLabel:{fontSize:11,color:palette.muted},metricValue:{fontSize:22,fontWeight:'900',color:palette.ink,fontVariant:['tabular-nums']},payable:{padding:15,borderRadius:12,backgroundColor:'#FFF5D9',gap:6},payableValue:{fontSize:18,fontWeight:'900',color:palette.ink},
  section:{padding:14,borderRadius:12,backgroundColor:palette.white,borderWidth:1,borderColor:palette.line,gap:10},sectionHeader:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontSize:13,fontWeight:'800',color:palette.ink,flexShrink:1},row:{flexDirection:'row',gap:12,justifyContent:'space-between'},rowLabel:{fontSize:12,color:palette.muted,flex:1},rowValue:{fontSize:12,color:palette.ink,fontWeight:'700',fontVariant:['tabular-nums']},
});
