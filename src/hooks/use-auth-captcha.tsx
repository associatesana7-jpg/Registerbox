import { Modal, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/registerbox-ui';
import { AUTH_CAPTCHA_ORIGIN, captchaPageUrl, readCaptchaMessage } from '@/lib/auth-captcha';
import { useCaptchaRequest } from './use-captcha-request';

export function useAuthCaptcha() {
  const { request, verify, finish } = useCaptchaRequest();
  const challenge = request ? <Modal visible animationType="slide" onRequestClose={() => finish({})}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>A quick security check</Text>
        <Text style={styles.copy}>This helps keep RegisterBox safe from automated sign-ins. You will return here automatically.</Text>
        <WebView key={request.id} source={{ uri: captchaPageUrl(AUTH_CAPTCHA_ORIGIN, request.action, request.id) }}
          style={styles.web} javaScriptEnabled domStorageEnabled thirdPartyCookiesEnabled
          originWhitelist={[AUTH_CAPTCHA_ORIGIN, 'https://challenges.cloudflare.com', 'about:blank', 'about:srcdoc']}
          onShouldStartLoadWithRequest={navigation => {
            try { const url = new URL(navigation.url); return url.origin === AUTH_CAPTCHA_ORIGIN || url.origin === 'https://challenges.cloudflare.com' || navigation.url === 'about:blank' || navigation.url === 'about:srcdoc'; } catch { return false; }
          }}
          onMessage={event => {
            try {
              const url = new URL(event.nativeEvent.url);
              if (url.origin !== AUTH_CAPTCHA_ORIGIN || !['/auth-challenge', '/auth-challenge.html'].includes(url.pathname)) return;
              const result = readCaptchaMessage(JSON.parse(event.nativeEvent.data), request.id);
              if (result) finish(result);
            } catch { /* Ignore untrusted/non-JSON bridge messages. */ }
          }}
          onError={() => finish({ error: 'Could not load the security check. Check your connection and try again.' })}
          onHttpError={() => finish({ error: 'Security check is temporarily unavailable. Please try again.' })}
        />
        <Button title="Cancel" variant="secondary" onPress={() => finish({})} />
      </View>
    </SafeAreaView>
  </Modal> : null;
  return { verify, challenge };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  body: { flex: 1, padding: 24, gap: 16 },
  title: { color: '#132747', fontSize: 22, fontWeight: '700' },
  copy: { color: '#52637A', fontSize: 14, lineHeight: 22 },
  web: { flex: 1, minHeight: 180, backgroundColor: '#FFF' },
});
