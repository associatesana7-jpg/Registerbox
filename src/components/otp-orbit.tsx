import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

export type OtpOrbitHandle = {
  begin: () => Promise<boolean>;
  succeed: (onLand?: () => void) => Promise<boolean>;
  reset: () => void;
};

type Props = { ref: Ref<OtpOrbitHandle>; value: string; focused: boolean; invalid: boolean; busy: boolean };
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const slots = Array.from({ length: 6 }, (_, index) => {
  const angle = (index * 60 - 90) * Math.PI / 180;
  return { x: Math.cos(angle) * 72, y: Math.sin(angle) * 72 };
});

/** Native-driver transforms only; a single shared hub draws the orbit. */
export function OtpOrbit({ ref, value, focused, invalid, busy }: Props) {
  const [width, setWidth] = useState(300);
  // Prefer no motion until the OS preference has resolved.
  const [reducedMotion, setReducedMotion] = useState(true);
  const [curl] = useState(() => new Animated.Value(0));
  const [turn] = useState(() => new Animated.Value(0));
  const [collapse] = useState(() => new Animated.Value(0));
  const [verdict] = useState(() => new Animated.Value(0));
  const active = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted && !preferenceChanged) setReducedMotion(enabled);
    }).catch(() => {});
    return () => {
      mounted = false;
      subscription.remove();
      active.current?.stop();
    };
  }, []);

  useImperativeHandle(ref, () => {
    const timing = (target: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(target, { toValue, duration, easing: ease, useNativeDriver: true });
    const run = (animation: Animated.CompositeAnimation) => new Promise<boolean>((resolve) => {
      active.current?.stop();
      active.current = animation;
      animation.start(({ finished }) => resolve(finished));
    });
    const reset = () => {
      active.current?.stop();
      curl.setValue(0);
      turn.setValue(0);
      collapse.setValue(0);
      verdict.setValue(0);
    };
    return {
      reset,
      begin: () => {
        reset();
        if (reducedMotion) return Promise.resolve(true);
        return run(Animated.sequence([timing(curl, 1, 420), timing(turn, 360, 1000)]));
      },
      // Called only after real authentication and account refresh succeed.
      succeed: async (onLand) => {
        const landed = await run(Animated.parallel([
          timing(turn, 450, reducedMotion ? 0 : 440),
          timing(collapse, 1, reducedMotion ? 160 : 440),
        ]));
        if (!landed) return false;
        onLand?.();
        return run(Animated.sequence([
          timing(verdict, 1, 200),
          Animated.delay(650),
        ]));
      },
    };
  }, [collapse, curl, reducedMotion, turn, verdict]);

  const pitch = Math.min(51, (width - 12) / 6);
  const boxWidth = Math.min(44, pitch - 6);
  const remaining = Animated.subtract(1, collapse);

  return (
    <View style={styles.stage} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.ring, {
        opacity: reducedMotion ? 0 : Animated.multiply(curl, remaining),
        transform: [{ scale: collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) }],
      }]} />
      <Animated.View style={[styles.hub, {
        // Two rotation targets: 360°, then 450°. Translated children rotate
        // around the shared origin without per-frame circular path maths.
        transformOrigin: '50% 50%',
        transform: reducedMotion ? [] : [{ rotate: turn.interpolate({ inputRange: [0, 450], outputRange: ['0deg', '450deg'] }) }],
        opacity: collapse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
      }]}>
        {slots.map((slot, index) => (
          <Animated.View key={index} style={[styles.box, {
            width: boxWidth, marginLeft: -boxWidth / 2,
            transform: [
              { translateX: reducedMotion ? (index - 2.5) * pitch : Animated.multiply(curl.interpolate({ inputRange: [0, 1], outputRange: [(index - 2.5) * pitch, slot.x] }), remaining) },
              { translateY: reducedMotion ? 0 : Animated.multiply(curl.interpolate({ inputRange: [0, 1], outputRange: [0, slot.y] }), remaining) },
              { scale: reducedMotion ? 1 : curl.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }) },
            ],
          }, focused && !busy && index === value.length && styles.activeBox, invalid && styles.invalidBox]}>
            {!!value[index] && <Text maxFontSizeMultiplier={1.4} style={styles.digit}>{value[index]}</Text>}
            {focused && !busy && index === value.length && <View style={styles.caret} />}
          </Animated.View>
        ))}
      </Animated.View>
      <Animated.View style={[styles.verified, {
        opacity: verdict,
        transform: reducedMotion ? [] : [
          { scale: verdict.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
          { translateY: verdict.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) },
        ],
      }]}><Text style={styles.check}>✓</Text></Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 224, width: '100%', alignItems: 'center', justifyContent: 'center' },
  hub: { position: 'absolute', width: '100%', height: 224 },
  ring: { position: 'absolute', width: 144, height: 144, borderRadius: 72, borderWidth: 1, borderColor: '#D4D7DC' },
  box: { position: 'absolute', left: '50%', top: '50%', marginTop: -28, height: 56, borderRadius: 13, borderWidth: 1, borderColor: '#DADDE1', backgroundColor: '#F0F1F3', alignItems: 'center', justifyContent: 'center' },
  activeBox: { backgroundColor: '#FFFFFF', borderColor: '#949BA4', boxShadow: '0 0 18px rgba(255,255,255,0.95), 0 3px 10px rgba(20,24,30,0.08)' },
  invalidBox: { borderColor: '#D73B45' },
  digit: { color: '#252A32', fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  caret: { width: 2, height: 20, borderRadius: 1, backgroundColor: '#555D68' },
  verified: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#009D62', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,157,98,0.18)' },
  check: { color: '#FFFFFF', fontSize: 34, fontWeight: '600' },
});
