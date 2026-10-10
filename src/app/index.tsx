import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/registerbox-ui';
import { contentWidth } from '@/constants/design';
import { useApp } from '@/hooks/use-app';

const LOGO_ANIMATION_DURATION_MS = 4800;

export default function SplashScreen() {
  const { session, loadingSession } = useApp();
  const insets = useSafeAreaInsets();
  const [animationFinished, setAnimationFinished] = useState(false);
  const [animationReady, setAnimationReady] = useState(false);
  const [actionsOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animationReady) return;
    const timer = setTimeout(() => {
      setAnimationFinished(true);
      Animated.timing(actionsOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }, LOGO_ANIMATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [actionsOpacity, animationReady]);

  useEffect(() => {
    if (!animationFinished || loadingSession || !session) return;
    router.replace('/(tabs)');
  }, [animationFinished, loadingSession, session]);

  return (
    <View style={styles.page}>
      <Image
        accessibilityLabel="RegisterBox logo animation"
        alt="RegisterBox logo animation"
        autoplay
        onLoad={() => setAnimationReady(true)}
        onError={() => { setAnimationFinished(true); actionsOpacity.setValue(1); }}
        contentFit="contain"
        source={
          animationFinished
            ? require('../../assets/images/registerbox-logo-final.png')
            : require('../../assets/images/registerbox-logo-animation.gif')
        }
        style={styles.logoAnimation}
      />

      {animationFinished && !loadingSession && !session ? (
        <Animated.View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 18), opacity: actionsOpacity },
          ]}>
          <View style={styles.actionContent}>
            <Button title="Get Started" icon="→" onPress={() => router.push('/auth')} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoAnimation: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
  actions: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingTop: 12,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  actionContent: {
    width: '100%',
    maxWidth: contentWidth,
    alignSelf: 'center',
  },
});
