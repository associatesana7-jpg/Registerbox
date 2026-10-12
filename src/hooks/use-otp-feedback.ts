import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

/** Feedback is best-effort: unavailable audio/haptics must never block sign-in. */
export function useOtpFeedback() {
  const player = useAudioPlayer(require('../../assets/audio/otp-success.wav'), { downloadFirst: true });
  const mounted = useRef(false);
  const audioReady = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
    }).then(() => { if (active) audioReady.current = true; }).catch(() => {});
    return () => {
      active = false;
      mounted.current = false;
      audioReady.current = false;
      // useAudioPlayer releases its native player on unmount.
    };
  }, [player]);

  function digit() {
    void Haptics.selectionAsync().catch(() => {});
  }

  function success() {
    if (!mounted.current) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (!audioReady.current || !player.isLoaded) return;
    void player.seekTo(0).then(() => {
      if (mounted.current) player.play();
    }).catch(() => {});
  }

  return { digit, success };
}
