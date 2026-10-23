import { Text, View } from 'react-native';

import type { ControlCenterStaff } from '@/lib/control-center-api';

export function AdminPayments(_props: { staff: ControlCenterStaff; query: string; refreshKey: number; onOpenBusiness: (id: string) => void }) {
  return <View style={{ padding: 24, gap: 10 }}><Text style={{ fontSize: 22, fontWeight: '700' }}>Payments & recovery</Text><Text>Open the RegisterBox Control Center in your web browser to review payment activity, reconcile Razorpay records and manage follow-ups.</Text></View>;
}
