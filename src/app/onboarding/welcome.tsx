import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Eyebrow, NavTile, ScreenTitle } from '@/components/experience';
import { BotIllustration } from '@/components/illustrations';
import { Button, Screen } from '@/components/registerbox-ui';
import { palette } from '@/constants/design';

export default function WelcomeScreen() {
  return <Screen footer={<Button title="Let’s get started" icon="→" onPress={() => router.push('/onboarding/identify')} />}>
    <View style={{ paddingTop: 4 }}><Eyebrow>YOUR BUSINESS COMPANION</Eyebrow></View>
    <ScreenTitle title="Meet RegisterBox AI ✦" subtitle="Your intelligent partner for registrations, licences and compliance." />
    <BotIllustration />
    <View style={{ gap: 9 }}>
      <NavTile title="Ask in plain language" detail="Describe your goal and get a guided path." icon="✧" onPress={() => router.push('/onboarding/intent')} />
      <NavTile title="Personalised guidance" detail="We use your business facts and location." icon="⌖" onPress={() => router.push('/onboarding/identify')} />
      <NavTile title="Save time" detail="Reuse verified information and uploaded documents." icon="◇" onPress={() => router.push('/onboarding/identify')} />
    </View>
    <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, paddingTop: 12 }}>You stay in control of every verification and filing step.</Text>
  </Screen>;
}
