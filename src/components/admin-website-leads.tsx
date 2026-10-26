import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  loadWebsiteLeads,
  updateWebsiteLead,
  type ControlCenterStaff,
  type WebsiteLead,
  type WebsiteLeadStatus,
} from '@/lib/control-center-api';

const filters: { key: WebsiteLeadStatus | 'all'; label: string }[] = [
  { key: 'new', label: 'New' }, { key: 'all', label: 'All' },
  { key: 'contacted', label: 'Contacted' }, { key: 'closed', label: 'Closed' },
];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, '').slice(-10);
}

export function AdminWebsiteLeads({ staff, query, refreshKey }: { staff: ControlCenterStaff; query: string; refreshKey: number }) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [filter, setFilter] = useState<WebsiteLeadStatus | 'all'>('new');
  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');
  const canUpdate = staff.permissions.includes('customer.update');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setLeads((await loadWebsiteLeads(filter)).leads); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Website enquiries could not be loaded.'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load, refreshKey]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter(lead => [lead.fullName, lead.phone, lead.serviceLabel, lead.sourcePath, lead.status].join(' ').toLowerCase().includes(needle));
  }, [leads, query]);

  const counts = useMemo(() => ({
    new: leads.filter(item => item.status === 'new').length,
    contacted: leads.filter(item => item.status === 'contacted').length,
    closed: leads.filter(item => item.status === 'closed').length,
  }), [leads]);

  const changeStatus = useCallback(async (lead: WebsiteLead, status: WebsiteLeadStatus) => {
    if (!canUpdate || status === lead.status) return;
    setUpdating(lead.id); setError('');
    try {
      const result = await updateWebsiteLead(lead.id, status);
      setLeads(current => filter === 'all' || filter === status
        ? current.map(item => item.id === lead.id ? result.lead : item)
        : current.filter(item => item.id !== lead.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The enquiry could not be updated.'); }
    finally { setUpdating(''); }
  }, [canUpdate, filter]);

  return <ScrollView contentContainerStyle={[styles.page, compact && styles.pageCompact]}>
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroCopy}><Text style={styles.eyebrow}>WEBSITE CALLBACK QUEUE</Text><Text style={styles.title}>Turn interest into a helpful call.</Text><Text style={styles.subtitle}>Every visitor here explicitly asked RegisterBox to contact them. Call promptly, then update the outcome so the queue stays useful.</Text></View>
      <View style={styles.heroMetric}><Text style={styles.metricValue}>{counts.new}</Text><Text style={styles.metricLabel}>NEW ENQUIRIES</Text><Text style={styles.metricHint}>Waiting for a first response</Text></View>
    </View>

    <View style={styles.toolbar}><View style={styles.filters}>{filters.map(item => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterActive]}><Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View><Text style={styles.queueCount}>{visible.length} visible</Text></View>
    {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Try again</Text></Pressable></View>}

    {loading ? <View style={styles.loading}><ActivityIndicator color="#0865F7"/><Text style={styles.loadingText}>Loading secure enquiries…</Text></View> : !visible.length ? <View style={styles.empty}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>{query ? 'No matching enquiries' : 'The queue is clear'}</Text><Text style={styles.emptyText}>{query ? 'Try a name, phone number or service.' : 'New callback requests will appear here automatically.'}</Text></View> : <View style={styles.grid}>{visible.map(lead => <View key={lead.id} style={[styles.card, lead.status === 'new' && styles.cardNew]}>
      <View style={styles.cardTop}><View style={styles.avatar}><Text style={styles.avatarText}>{lead.fullName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.identity}><Text style={styles.name}>{lead.fullName}</Text><Text style={styles.time}>{dateLabel(lead.createdAt)} · {lead.locale.toUpperCase()}</Text></View><View style={[styles.status, lead.status === 'new' ? styles.status_new : lead.status === 'contacted' ? styles.status_contacted : styles.status_closed]}><Text style={styles.statusText}>{lead.status.toUpperCase()}</Text></View></View>
      <View style={styles.service}><Text style={styles.serviceLabel}>NEEDS HELP WITH</Text><Text style={styles.serviceValue}>{lead.serviceLabel}</Text></View>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`tel:+91${cleanPhone(lead.phone)}`)} style={({ pressed }) => [styles.call, pressed && styles.pressed]}><View><Text style={styles.callLabel}>CALL NOW</Text><Text selectable style={styles.phone}>+91 {lead.phone}</Text></View><Text style={styles.callArrow}>↗</Text></Pressable>
      <View style={styles.source}><Text style={styles.sourceLabel}>Came from</Text><Text numberOfLines={1} style={styles.sourcePath}>{lead.sourcePath}</Text></View>
      <View style={styles.actions}><Text style={styles.actionsLabel}>OUTCOME</Text><View style={styles.actionRow}>{(['new', 'contacted', 'closed'] as WebsiteLeadStatus[]).map(status => <Pressable key={status} disabled={!canUpdate || updating === lead.id} onPress={() => void changeStatus(lead, status)} style={[styles.action, lead.status === status && styles.actionActive]}><Text style={[styles.actionText, lead.status === status && styles.actionTextActive]}>{status === 'new' ? 'To call' : status === 'contacted' ? 'Contacted' : 'Close'}</Text></Pressable>)}{updating === lead.id && <ActivityIndicator size="small" color="#0865F7"/>}</View></View>
    </View>)}</View>}
    <Text style={styles.security}>Contact details are shown only to authorised staff. Viewing and status changes are recorded in the audit log.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page:{padding:32,gap:20,backgroundColor:'#F4F7FC',minHeight:'100%'},pageCompact:{padding:18},hero:{padding:30,borderRadius:24,backgroundColor:'#081B4B',flexDirection:'row',justifyContent:'space-between',gap:24,boxShadow:'0 20px 45px rgba(8,27,75,.18)'},heroCompact:{flexDirection:'column'},heroCopy:{maxWidth:720,gap:8},eyebrow:{color:'#79ABFF',fontSize:11,fontWeight:'900',letterSpacing:1.8},title:{color:'#FFF',fontSize:32,fontWeight:'900',letterSpacing:-1},subtitle:{color:'#B8C8E7',fontSize:15,lineHeight:24},heroMetric:{minWidth:190,padding:20,borderRadius:18,backgroundColor:'rgba(255,255,255,.08)',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},metricValue:{color:'#FFF',fontSize:38,fontWeight:'900'},metricLabel:{color:'#80AEFF',fontSize:10,fontWeight:'900',letterSpacing:1.3},metricHint:{color:'#B8C8E7',fontSize:12,marginTop:8},toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},filters:{flexDirection:'row',gap:8,flexWrap:'wrap'},filter:{paddingHorizontal:16,paddingVertical:9,borderRadius:999,backgroundColor:'#FFF',borderWidth:1,borderColor:'#DDE6F2'},filterActive:{backgroundColor:'#0865F7',borderColor:'#0865F7'},filterText:{color:'#52627D',fontSize:13,fontWeight:'800'},filterTextActive:{color:'#FFF'},queueCount:{color:'#70809A',fontSize:12,fontWeight:'800'},grid:{flexDirection:'row',flexWrap:'wrap',gap:16},card:{width:360,maxWidth:'100%',padding:20,borderRadius:20,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E1E8F2',boxShadow:'0 10px 30px rgba(15,38,88,.06)'},cardNew:{borderColor:'#B7D0FF',boxShadow:'0 13px 32px rgba(8,101,247,.1)'},cardTop:{flexDirection:'row',alignItems:'center',gap:12},avatar:{width:42,height:42,borderRadius:14,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center'},avatarText:{color:'#0865F7',fontSize:17,fontWeight:'900'},identity:{flex:1},name:{color:'#0A1943',fontSize:17,fontWeight:'900'},time:{color:'#8491A7',fontSize:11,marginTop:3},status:{paddingHorizontal:8,paddingVertical:5,borderRadius:999},status_new:{backgroundColor:'#EAF2FF'},status_contacted:{backgroundColor:'#E9F9F1'},status_closed:{backgroundColor:'#EEF1F5'},statusText:{color:'#245395',fontSize:9,fontWeight:'900',letterSpacing:.7},service:{marginTop:18,padding:14,borderRadius:14,backgroundColor:'#F6F8FC'},serviceLabel:{color:'#8997AD',fontSize:9,fontWeight:'900',letterSpacing:1},serviceValue:{color:'#13264F',fontSize:15,fontWeight:'900',marginTop:5},call:{marginTop:12,paddingHorizontal:15,paddingVertical:12,borderRadius:14,backgroundColor:'#0865F7',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},callLabel:{color:'#BFD5FF',fontSize:9,fontWeight:'900',letterSpacing:1},phone:{color:'#FFF',fontSize:17,fontWeight:'900',marginTop:2},callArrow:{color:'#FFF',fontSize:20,fontWeight:'900'},source:{flexDirection:'row',gap:8,marginTop:12},sourceLabel:{color:'#8A98AD',fontSize:11},sourcePath:{color:'#53637E',fontSize:11,fontWeight:'700',flex:1},actions:{marginTop:18,paddingTop:16,borderTopWidth:1,borderTopColor:'#E9EEF5'},actionsLabel:{color:'#8A98AD',fontSize:9,fontWeight:'900',letterSpacing:1},actionRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:9,flexWrap:'wrap'},action:{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:'#F2F5F9'},actionActive:{backgroundColor:'#102A63'},actionText:{color:'#63718A',fontSize:11,fontWeight:'800'},actionTextActive:{color:'#FFF'},error:{padding:16,borderRadius:14,backgroundColor:'#FFF0F1',flexDirection:'row',justifyContent:'space-between'},errorText:{color:'#AA2634',fontWeight:'700'},retry:{color:'#0865F7',fontWeight:'900'},loading:{padding:50,alignItems:'center',gap:12},loadingText:{color:'#6A7890'},empty:{padding:56,borderRadius:20,backgroundColor:'#FFF',alignItems:'center',borderWidth:1,borderColor:'#E1E8F2'},emptyIcon:{color:'#0FA56A',fontSize:28,fontWeight:'900'},emptyTitle:{color:'#0A1943',fontSize:20,fontWeight:'900',marginTop:8},emptyText:{color:'#75839A',fontSize:13,marginTop:5},security:{color:'#7A889D',fontSize:11,textAlign:'center',marginTop:4},pressed:{opacity:.86},
});
