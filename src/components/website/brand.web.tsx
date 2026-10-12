import { Link } from 'expo-router';
export function WebBrand() {
  return <Link href="/" className="rb-brand" aria-label="RegisterBox home"><img src="/images/registerbox-logo.png" width={42} height={42} alt="RegisterBox logo"/><span>Register<span className="rb-brand-box">Box</span><small>YOUR BUSINESS. SORTED.</small></span></Link>;
}
