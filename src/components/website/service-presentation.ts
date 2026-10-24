export type ServicePresentation = {
  title: string;
  promise: string;
  audience: string;
  icon: string;
  tone: 'violet' | 'blue' | 'peach' | 'mint';
  benefits: [string, string, string];
  documents: [string, string, string];
};

export const servicePresentation: Record<string, ServicePresentation> = {
  company: { title: 'Private limited company', promise: 'Your business idea. A company of its own.', audience: 'For founders starting a company with share-based ownership.', icon: 'company', tone: 'violet', benefits: ['Director & ownership details', 'Office document checklist', 'Incorporation preparation'], documents: ['Director details', 'Business & shareholding plan', 'Registered-office proof'] },
  llp: { title: 'LLP registration', promise: 'A shared ambition. A structured partnership.', audience: 'For partners preparing to build a business together.', icon: 'llp', tone: 'mint', benefits: ['Partner information', 'Contribution planning', 'Application preparation'], documents: ['Partner details', 'Contribution plan', 'Office proof'] },
  gst_registration: { title: 'GST registration', promise: 'Get your GST application in good order.', audience: 'For businesses seeking help with a new GST registration.', icon: 'gst-registration', tone: 'blue', benefits: ['Business details organised', 'Document checklist', 'Application support'], documents: ['Business identity', 'Owner / entity details', 'Business-address proof'] },
  food: { title: 'FSSAI food business registration', promise: 'You bring the flavour. We help you start right.', audience: 'For home cooks, bakers, tiffin services, cloud kitchens and growing food businesses.', icon: 'food', tone: 'peach', benefits: ['Basic package ₹1,999', 'First annual government fee included', 'State & Central licences by quote'], documents: ['Applicant photo & government ID', 'Business-address proof where required', 'Food activity, products & turnover'] },
  retail: { title: 'Shop & establishment', promise: 'Your shop. Ready for its next chapter.', audience: 'For shops and establishments reviewing local registration needs.', icon: 'retail', tone: 'peach', benefits: ['Establishment details', 'Local requirements review', 'Document preparation'], documents: ['Owner details', 'Premises proof', 'Workforce information'] },
  gst: { title: 'GST return filing', promise: 'Less chasing records. More clarity.', audience: 'For GST-registered businesses organising returns and records.', icon: 'gst-return', tone: 'blue', benefits: ['Period & records review', 'Return preparation', 'Acknowledgement tracking'], documents: ['GST account information', 'Sales & purchase records', 'Previous acknowledgements'] },
  gst_nil: { title: 'Free nil GST filing', promise: 'An eligible nil return. A ₹0 service fee.', audience: 'For eligible nil GSTR-1 and GSTR-3B returns. Check your records and period before filing.', icon: 'gst-return', tone: 'mint', benefits: ['₹0 RegisterBox service fee', 'Nil eligibility checks', 'Acknowledgement tracking'], documents: ['GST account information', 'Complete period records', 'Previous filing status'] },
  new: { title: 'Start a business', promise: 'A big idea starts with one clear next step.', audience: 'For first-time founders deciding where to begin.', icon: 'new-business', tone: 'violet', benefits: ['Business idea discussion', 'Structure & service options', 'A practical starting plan'], documents: ['Your business idea', 'Owners / partners', 'Planned location'] },
  online: { title: 'Online & e-commerce', promise: 'Take your business beyond the shopfront.', audience: 'For sellers planning a website or marketplace business.', icon: 'online', tone: 'blue', benefits: ['Sales-channel planning', 'Location details organised', 'Registration needs review'], documents: ['Products & services', 'Selling platforms', 'Dispatch locations'] },
  manufacturing: { title: 'Manufacturing business', promise: 'From your workshop to what’s next.', audience: 'For manufacturers organising their setup and approval requirements.', icon: 'manufacturing', tone: 'peach', benefits: ['Activity & premises review', 'Approval needs discussion', 'Document organisation'], documents: ['Products & processes', 'Premises details', 'Workforce information'] },
  branch: { title: 'Open a new branch', promise: 'More room for your growing business.', audience: 'For existing businesses planning an additional location.', icon: 'branch', tone: 'mint', benefits: ['Existing records organised', 'New premises checklist', 'Branch requirements review'], documents: ['Existing registrations', 'New location proof', 'Proposed activities'] },
  existing: { title: 'Compliance check', promise: 'Know what’s in place. Know what’s next.', audience: 'For owners who want help organising registrations and open questions.', icon: 'business-check', tone: 'mint', benefits: ['Records inventory', 'Gaps & questions identified', 'Next steps for review'], documents: ['Current registrations', 'Available acknowledgements', 'Deadlines & questions'] },
  udyam: { title: 'Udyam registration', promise: 'A small business. A clear next step.', audience: 'For business owners seeking guided MSME registration assistance.', icon: 'new-business', tone: 'mint', benefits: ['Business details reviewed', 'Application assistance', 'Certificate handover'], documents: ['Owner & entity details', 'Business activity', 'PAN & relevant GST details'] },
  income_tax: { title: 'Income tax filing', promise: 'Your records. A return you can review.', audience: 'For taxpayers preparing an income tax return within an agreed scope.', icon: 'business-check', tone: 'blue', benefits: ['Income checklist', 'Return preparation & review', 'Acknowledgement support'], documents: ['Income records', 'Tax statements', 'Deduction evidence'] },
  mca: { title: 'MCA compliance · 1 year', promise: 'A year of company compliance. In clearer order.', audience: 'For companies organising annual MCA compliance with professional coordination.', icon: 'company', tone: 'violet', benefits: ['Annual checklist', 'Preparation coordination', 'Filing acknowledgements'], documents: ['Company records', 'Financial statements', 'Director & meeting details'] },
  dsc: { title: 'Digital signature certificate', promise: 'Your signature. Ready for digital work.', audience: 'For individuals and organisations applying for a signing certificate.', icon: 'business-check', tone: 'mint', benefits: ['2-year signing certificate', 'USB token included', 'Verification & delivery support'], documents: ['Applicant identity', 'Contact verification', 'Organisation evidence, if applicable'] },
  proprietorship: { title: 'Proprietorship & GST packages', promise: 'One business. Support for the year ahead.', audience: 'For proprietors comparing registration, monthly return support and annual GST with ITR packages.', icon: 'new-business', tone: 'peach', benefits: ['Registration options', 'Monthly & annual support', 'Clear package inclusions'], documents: ['Proprietor identity', 'Business-address proof', 'GST & financial records'] },
  trademark: { title: 'Trademark application', promise: 'Your brand has a name. Give it a plan.', audience: 'For business owners preparing a brand-name or logo application.', icon: 'business-check', tone: 'violet', benefits: ['Brand & applicant details', 'Goods / services discussion', 'Application preparation'], documents: ['Brand name or logo', 'Applicant details', 'Goods or services'] },
};

export const serviceActionLabels: Record<string, string> = {
  company: 'Start company registration',
  llp: 'Start LLP registration',
  gst_registration: 'Start GST registration',
  food: 'Start Basic Registration',
  retail: 'Start shop registration',
  gst: 'Open GST workspace',
  new: 'Start my business',
  online: 'Start online-business setup',
  manufacturing: 'Start manufacturing setup',
  branch: 'Start branch application',
  existing: 'Start compliance check',
  trademark: 'Choose trademark package',
  udyam: 'Start Udyam registration',
  income_tax: 'Start income tax filing',
  mca: 'Choose annual compliance',
  dsc: 'Choose a DSC package',
  proprietorship: 'Compare GST packages',
};
