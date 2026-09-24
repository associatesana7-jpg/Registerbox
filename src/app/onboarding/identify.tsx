import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented, flowStyles } from '@/components/flow-parts';
import { Badge, Button, Card, ErrorBanner, Field, PageHeader, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';
import { useApp } from '@/hooks/use-app';
import { type BusinessIdentityResult, verifyBusinessIdentity } from '@/lib/registerbox-api';

type IdentifierType = 'PAN' | 'GSTIN';
const patterns: Record<IdentifierType, RegExp> = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
};

export default function IdentifyBusinessScreen() {
  const { business, updateBusiness } = useApp();
  const [identifierType, setIdentifierType] = useState<IdentifierType>('PAN');
  const [value, setValue] = useState(business.pan === 'DEMO-PAN' ? '' : business.pan);
  const [panName, setPanName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BusinessIdentityResult | null>(null);
  const requestNumber = useRef(0);
  const businessRef = useRef(business);
  const updateBusinessRef = useRef(updateBusiness);

  useEffect(() => {
    businessRef.current = business;
    updateBusinessRef.current = updateBusiness;
  }, [business, updateBusiness]);

  const normalized = value.replace(/\s+/g, '').toUpperCase();
  const formatValid = patterns[identifierType].test(normalized);
  const panDetailsValid = identifierType === 'GSTIN' || (panName.trim().length >= 2 && /^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth));

  useEffect(() => {
    if (!consent || !formatValid || !panDetailsValid) return;
    const currentRequest = ++requestNumber.current;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const verified = await verifyBusinessIdentity(identifierType, normalized, identifierType === 'PAN' ? panName.trim() : undefined, identifierType === 'PAN' ? dateOfBirth : undefined);
        if (currentRequest !== requestNumber.current) return;
        if (!verified.valid) {
          setError(`This ${identifierType} could not be verified as active.`);
          return;
        }
        setResult(verified);
        const currentBusiness = businessRef.current;
        updateBusinessRef.current({
          ...(identifierType === 'PAN' ? { pan: verified.identifier } : { gstin: verified.identifier, pan: verified.identifier.slice(2, 12) }),
          legalName: verified.legalName || currentBusiness.legalName,
          tradeName: verified.tradeName || verified.legalName || currentBusiness.tradeName,
          entityType: verified.entityType || currentBusiness.entityType,
          city: verified.city || currentBusiness.city,
          state: verified.state || currentBusiness.state,
          address: verified.address || currentBusiness.address,
          pincode: verified.pincode || currentBusiness.pincode,
          verificationId: verified.verificationId,
          verificationType: identifierType,
          verifiedAt: verified.verifiedAt,
          registrationStatus: verified.registrationStatus || undefined,
          taxpayerType: verified.taxpayerType || undefined,
          natureOfBusinessActivities: verified.natureOfBusinessActivities,
        });
      } catch (cause) {
        if (currentRequest === requestNumber.current) setError(cause instanceof Error ? cause.message : 'Verification failed. Please try again.');
      } finally {
        if (currentRequest === requestNumber.current) setLoading(false);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [consent, dateOfBirth, formatValid, identifierType, normalized, panDetailsValid, panName]);

  function switchType(next: string) {
    const selected = next as IdentifierType;
    requestNumber.current += 1;
    setIdentifierType(selected);
    setValue(selected === 'PAN' ? (business.pan === 'DEMO-PAN' ? '' : business.pan) : (business.gstin === 'DEMO-GSTIN' ? '' : business.gstin));
    setResult(null);
    setError('');
  }

  function toggleConsent() {
    requestNumber.current += 1;
    setConsent(!consent);
    setResult(null);
    setError('');
  }

  return (
    <Screen footer={<Button title={result ? 'Continue' : 'Verify to continue'} icon={result ? '→' : undefined} disabled={!result || loading} onPress={() => router.push('/onboarding/business')} />}>
      <PageHeader title="Let’s find your business" subtitle="Enter a PAN or GSTIN. We’ll securely verify it and fill the details available from official records." back={() => router.back()} />
      <View style={flowStyles.stack}>
        <Segmented options={['PAN', 'GSTIN']} selected={identifierType} onSelect={switchType} />
        <Field placeholder={`Enter ${identifierType}`} autoCapitalize="characters" autoCorrect={false} maxLength={identifierType === 'PAN' ? 10 : 15} value={value} onChangeText={(text) => { requestNumber.current += 1; setValue(text.toUpperCase()); setResult(null); setError(''); }} />
        {normalized.length > 0 && !formatValid && <Text style={styles.hint}>Enter a valid {identifierType === 'PAN' ? '10-character PAN' : '15-character GSTIN'}.</Text>}
        {identifierType === 'PAN' && <>
          <Text style={styles.panNotice}>Sandbox PAN verification matches the details you provide; it does not disclose a person’s name from a PAN number.</Text>
          <Field label="Name as per PAN" placeholder="Legal name or PAN holder name" value={panName} onChangeText={(text) => { requestNumber.current += 1; setPanName(text); setResult(null); setError(''); }} autoCapitalize="words" />
          <Field label="DOB / date of incorporation" placeholder="DD/MM/YYYY" value={dateOfBirth} onChangeText={(text) => { requestNumber.current += 1; setDateOfBirth(text); setResult(null); setError(''); }} keyboardType="number-pad" maxLength={10} />
        </>}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={toggleConsent} style={styles.consentRow}>
          <View style={[styles.checkbox, consent && styles.checkboxSelected]}>{consent && <Text style={styles.check}>✓</Text>}</View>
          <Text style={styles.consentText}>I consent to RegisterBox verifying this business identifier to prefill my profile and recommend applicable registrations and licences.</Text>
        </Pressable>
        {loading && <Card><Text style={styles.verifying}>Checking trusted records…</Text><Text style={styles.small}>This normally takes a few seconds.</Text></Card>}
        <ErrorBanner message={error} />
        {result && <Card>
          <View style={styles.resultHeader}><Text style={styles.resultTitle}>✓ Verified business</Text><Badge label={result.cached ? 'Recently verified' : 'Live result'} tone="green" /></View>
          <Text selectable style={styles.businessName}>{result.tradeName || result.legalName}</Text>
          {result.legalName && result.tradeName !== result.legalName && <Detail label="Legal name" value={result.legalName} />}
          <Detail label="Status" value={result.registrationStatus || 'Verified'} />
          <Detail label="Entity" value={result.entityType || result.taxpayerType || 'Business'} />
          {result.address && <Detail label="Principal address" value={result.address} />}
          <Text style={styles.source}>Source: government registry via Sandbox.co.in • checked {new Date(result.verifiedAt).toLocaleString()}</Text>
        </Card>}
        <View style={styles.security}><Text style={styles.securityTitle}>🔒 Private by design</Text><Text style={styles.small}>Verification credentials stay in Supabase. We keep an audit fingerprint and the business details needed for compliance—not a second raw copy of the identifier.</Text></View>
      </View>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hint: { color: palette.muted, fontSize: 12, marginTop: -6 }, panNotice: { color: palette.muted, fontSize: 11, lineHeight: 16, backgroundColor: palette.sky, borderRadius: 10, padding: 11 }, consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, check: { color: palette.white, fontWeight: '900' },
  consentText: { flex: 1, color: palette.muted, fontSize: 11, lineHeight: 17 }, verifying: { color: palette.blue, fontSize: 14, fontWeight: '800' }, small: { color: palette.muted, fontSize: 11, lineHeight: 17 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, resultTitle: { color: palette.green, fontWeight: '900', fontSize: 14 }, businessName: { color: palette.ink, fontSize: 19, fontWeight: '900' },
  detail: { flexDirection: 'row', gap: 12 }, detailLabel: { width: 92, color: palette.muted, fontSize: 11 }, detailValue: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: '700' }, source: { color: palette.muted, fontSize: 10, lineHeight: 15, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 },
  security: { backgroundColor: palette.sky, borderRadius: 14, padding: 14, gap: 5 }, securityTitle: { color: palette.blue, fontWeight: '800', fontSize: 12 },
});
