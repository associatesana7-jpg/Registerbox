import { Image } from 'expo-image';
import { Link } from 'expo-router';
export function WebBrand() {
  return <Link href="/" className="rb-brand" aria-label="RegisterBox home"><Image source={require('../../../assets/images/registerbox-app-icon.png')} style={{ width: 42, height: 42 }} contentFit="contain" alt="RegisterBox logo"/><span>Register<span className="rb-brand-box">Box</span><small>YOUR BUSINESS. SORTED.</small></span></Link>;
}
