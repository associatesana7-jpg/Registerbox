import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Eyebrow, NavTile, ScreenTitle } from '@/components/experience';
import { BotIllustration } from '@/components/illustrations';
import { Button, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

export default function WelcomeScreen() {
  return <Screen footer={<Button title="Choose a service" icon="→" onPress={() => router.push('/onboarding/intent')} />}>
    <View style={{ paddingTop: 4 }}><Eyebrow>YOUR BUSINESS COMPANION</Eyebrow></View>
    <ScreenTitle title="Meet RegisterBox AI ✦" subtitle="Your intelligent partner for registrations, licences and compliance." />
    <BotIllustration />
    <View style={{ gap: 9 }}>
      <NavTile title="Ask in plain language" detail="Open the AI assistant. Sending a question is optional." icon="✧" onPress={() => router.push('/(tabs)/ai')} />
      <NavTile title="Check my business requirements" detail="Review your business activity and existing registrations." icon="⌖" onPress={() => router.push({pathname:'/onboarding/application',params:{category:'existing'}})} />
      <NavTile title="Reuse saved documents" detail="Open your business document wallet." icon="◇" onPress={() => router.push('/(tabs)/documents')} />
    </View>
    <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, paddingTop: 12 }}>You stay in control of every verification and filing step.</Text>
  </Screen>;
}
