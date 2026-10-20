import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';
import { usePathname } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { publicAnalyticsUrl } from '@/lib/public-analytics';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null;
  const url = publicAnalyticsUrl(event.url);
  // The script can outlive this component after SPA navigation. Check the
  // actual current page too, so a stale public event cannot expose a private URL.
  if (!url || !publicAnalyticsUrl(window.location.href)) return null;
  return { type: 'pageview', url };
}
export function PublicAnalytics() {
  const pathname = usePathname();
  // Hydration-safe browser state; the router subscription rerenders on SPA
  // navigation without an effect that schedules an extra render.
  const href = useSyncExternalStore(subscribe, currentHref, serverHref);
  const publicUrl = publicAnalyticsUrl(href);
  if (!publicUrl) return null;
  const path = new URL(publicUrl).pathname;
  if (pathname !== path) return null;
  return <Analytics mode="production" debug={false} beforeSend={beforeSend} route={path} path={path}/>;
}
const subscribe = () => () => {};
const currentHref = () => window.location.href;
const serverHref = () => '';
