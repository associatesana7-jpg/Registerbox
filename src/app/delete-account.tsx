import { Screen, PageHeader } from '@/components/registerbox-ui';
import { PrivacyDeletion } from '@/components/privacy-deletion';
export default function DeleteAccountScreen() {
  return <Screen><PageHeader title="Account & data deletion" subtitle="Submit a request, understand retention, and track its status."/><PrivacyDeletion/></Screen>;
}
