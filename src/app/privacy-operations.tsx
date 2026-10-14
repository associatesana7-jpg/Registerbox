import { Screen, PageHeader } from '@/components/registerbox-ui';
import { PrivacyOperations } from '@/components/privacy-operations';
import Head from 'expo-router/head';
export default function PrivacyOperationsScreen(){return <Screen><Head><title>Privacy Operations | RegisterBox</title><meta name="robots" content="noindex,nofollow"/></Head><PageHeader title="Privacy Operations" subtitle="Restricted operator queue and audited responses."/><PrivacyOperations/></Screen>;}
