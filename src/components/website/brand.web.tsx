import { Link } from 'expo-router';
export function WebBrand() {
  return <Link href="/" className="rb-brand" aria-label="RegisterBox — Your business. Sorted. home"><img src="/images/registerbox-logo.png" width={42} height={42} alt=""/><span>Register<span className="rb-brand-box">Box</span><small>YOUR BUSINESS. SORTED.</small></span></Link>;
}
