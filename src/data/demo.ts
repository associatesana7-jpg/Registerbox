export type ComplianceItem = {
  id: string;
  name: string;
  slug: string;
  status: 'REQUIRED' | 'CHECK_REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  fee: number;
  reason: string;
  icon: string;
};

export const demoCompliances: ComplianceItem[] = [
  { id: '1', name: 'FSSAI Licence', slug: 'fssai', status: 'REQUIRED', fee: 1999, icon: '🍽️', reason: 'Required because ABC Foods prepares and sells food.' },
  { id: '2', name: 'GST Registration', slug: 'gst-registration', status: 'CHECK_REQUIRED', fee: 999, icon: '▦', reason: 'Your turnover and sale channels need a GST applicability check.' },
  { id: '3', name: 'Trade Licence', slug: 'trade-licence', status: 'REQUIRED', fee: 999, icon: '🏬', reason: 'A Bengaluru restaurant needs municipal trade permission.' },
  { id: '4', name: 'Shops & Establishment', slug: 'shops-establishment', status: 'REQUIRED', fee: 999, icon: '🏢', reason: 'Your commercial premises and employees trigger a state assessment.' },
  { id: '5', name: 'Professional Tax', slug: 'professional-tax', status: 'CHECK_REQUIRED', fee: 499, icon: '₹', reason: 'Professional tax depends on the Karnataka employee setup.' },
  { id: '6', name: 'Udyam (MSME)', slug: 'udyam', status: 'RECOMMENDED', fee: 499, icon: '◉', reason: 'Recommended to access MSME recognition and benefits.' },
  { id: '7', name: 'Trademark', slug: 'trademark', status: 'OPTIONAL', fee: 6999, icon: '®', reason: 'Optional protection for the ABC Foods name and brand.' },
];

export const applicationRows = [
  { icon: '🍽️', name: 'FSSAI Licence', detail: 'Application Submitted · 12 Sep 2024', status: 'In Progress', tone: 'blue' },
  { icon: '▦', name: 'GST Registration', detail: 'Verification in Progress · 11 Sep 2024', status: 'In Progress', tone: 'blue' },
  { icon: '🏬', name: 'Trade Licence (BBMP)', detail: 'Yet to be filed', status: 'Pending', tone: 'red' },
  { icon: '🏢', name: 'Shops & Establishment', detail: 'Approved · 10 Sep 2024', status: 'Completed', tone: 'green' },
  { icon: '₹', name: 'Professional Tax', detail: 'Preparing application', status: 'Pending', tone: 'amber' },
];
