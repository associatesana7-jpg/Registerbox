export type ApplicationQuestion={key:string;label:string;options?:string[];numeric?:boolean;kind?:'address';when?:[string,string];min?:number;max?:number;integer?:boolean;pattern?:string;help?:string};
export type ApplicationCategory={title:string;questions:ApplicationQuestion[];documents:{type:string;label:string;when?:[string,string];optional?:boolean}[];source?:string;notice?:string};
const location:ApplicationQuestion[]=[{key:'address',label:'Where will this business operate?',kind:'address'},{key:'activity_sector',label:'Choose the main business sector',options:['IT / software','Professional services','Trading / retail','Food services','Food manufacturing','Other manufacturing','Construction','Transport / logistics','Education','Healthcare','Other']},{key:'activity',label:'What specific products or services will you provide?',help:'Describe the actual activity; the final government form may also require a NIC or HSN/SAC code.'}];
const premises:ApplicationQuestion={key:'premises',label:'What type of premises will you use?',options:['Owned','Rented','Home-based','Not decided']};
const addressDocs=[{type:'ADDRESS_PROOF',label:'Business address proof'},{type:'RENT_AGREEMENT',label:'Rent agreement',when:['premises','Rented'] as [string,string]}];
export const applicationCategories:Record<string,ApplicationCategory>={
  new:{title:'Start a new business',questions:[...location,{key:'structure',label:'Business structure',options:['Sole proprietor','Partnership','Private limited','LLP','Not decided']},premises],documents:[{type:'PAN_CARD',label:'Applicant PAN'},...addressDocs]},
  company:{title:'Register a private limited company',questions:[...location,{key:'directors',label:'How many proposed directors?',numeric:true},{key:'shareholders',label:'How many shareholders?',numeric:true},{key:'proposed_name',label:'Proposed company name'},premises],documents:[{type:'DIRECTOR_PAN',label:'Director PAN documents'},{type:'DIRECTOR_ID',label:'Director identity proof'},...addressDocs,{type:'OWNER_NOC',label:'Registered office owner consent'}]},
  llp:{title:'Register an LLP',questions:[...location,{key:'partners',label:'How many proposed partners?',numeric:true},{key:'proposed_name',label:'Proposed LLP name'},premises],documents:[{type:'PARTNER_PAN',label:'Partner PAN documents'},{type:'PARTNER_ID',label:'Partner identity proof'},...addressDocs,{type:'OWNER_NOC',label:'Office owner consent'}]},
  food:{title:'Start a food business',questions:[...location,{key:'food_activity',label:'What kind of food business?',options:['Restaurant','Cloud kitchen','Retail','Manufacturing','Catering']},{key:'dine_in',label:'Will customers dine at the premises?',options:['Yes','No']},{key:'turnover',label:'Estimated annual turnover in rupees',numeric:true},premises,{key:'existing_fssai',label:'Do you already have FSSAI registration or a licence?',options:['Yes','No']}],documents:[{type:'PAN_CARD',label:'Applicant PAN'},...addressDocs,{type:'FSSAI_CERTIFICATE',label:'Existing FSSAI certificate',when:['existing_fssai','Yes']},{type:'PREMISES_LAYOUT',label:'Premises layout'}]},
  retail:{title:'Open a shop / retail business',questions:[...location,{key:'employees',label:'Number of employees',numeric:true},{key:'sells_food',label:'Will you sell food products?',options:['Yes','No']},premises],documents:[{type:'PAN_CARD',label:'Applicant PAN'},...addressDocs]},
  manufacturing:{title:'Start manufacturing',questions:[...location,{key:'product',label:'What will you manufacture?'},{key:'employees',label:'Number of workers',numeric:true},{key:'power',label:'Will the process use power?',options:['Yes','No']},premises],documents:[{type:'PAN_CARD',label:'Applicant PAN'},...addressDocs,{type:'PROCESS_DESCRIPTION',label:'Manufacturing process description'},{type:'PREMISES_LAYOUT',label:'Premises layout'}]},
  online:{title:'Start an online business',questions:[...location,{key:'channel',label:'Where will you sell?',options:['Own website','Marketplace','Both']},{key:'interstate',label:'Will you sell across state borders?',options:['Yes','No','Not decided']},premises],documents:[{type:'PAN_CARD',label:'Applicant PAN'},...addressDocs]},
  branch:{title:'Open a new branch',questions:[...location,{key:'parent_name',label:'Name of the existing business'},premises],documents:[{type:'INCORPORATION_CERTIFICATE',label:'Existing business registration'},...addressDocs]},
  existing:{title:'Check my existing business',questions:[...location,{key:'structure',label:'Business structure',options:['Sole proprietor','Partnership','Private limited','LLP']},{key:'employees',label:'Number of employees',numeric:true}],documents:[{type:'PAN_CARD',label:'Business PAN'},{type:'EXISTING_REGISTRATION',label:'Existing registrations and licences'}]},
  gst:{title:'Set up your GST workspace',questions:[],documents:[]},
};
const yesNo=['Yes','No'];
const structure:ApplicationQuestion={key:'structure',label:'What is the legal constitution?',options:['Sole proprietor','Partnership','Private limited','LLP','Trust / society','Other']};
const contact:ApplicationQuestion[]=[{key:'contact_name',label:'Who is the contact person?'},{key:'contact_email',label:'Contact email address',pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'},{key:'contact_mobile',label:'Indian contact mobile number',pattern:'^[6-9][0-9]{9}$'}];
const countOptions=(min:number,max:number)=>Array.from({length:max-min+1},(_,i)=>String(i+min));
applicationCategories.udyam={
  title:'Apply for Udyam registration assistance',
  questions:[
    ...location,
    structure,
    {key:'commencement',label:'Business commencement date · YYYY-MM-DD',pattern:'^\\d{4}-\\d{2}-\\d{2}$',help:'Use the business records. If you are still planning, contact us before sending the application.'},
    {key:'existing_udyam',label:'Does this enterprise already have Udyam registration?',options:['Yes','No','Not sure'],help:'One enterprise must not have multiple registrations. Existing records need review before a new registration is considered.'},
    {key:'udyam_number',label:'Existing Udyam registration number',when:['existing_udyam','Yes'],pattern:'^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$',help:'Use the format UDYAM-XX-00-0000000. This request is for reviewing or updating the existing record, not duplicating it.'},
    {key:'investment',label:'Investment in plant, machinery or equipment in ₹',numeric:true,min:0,help:'Enter the figure from your records. The official classification uses the applicable calculation and government-linked data, not simply the value of all business assets.'},
    {key:'turnover',label:'Annual turnover in ₹',numeric:true,min:0,help:'Use the most recent completed financial year. Enter 0 if you have not started trading; explain this in your activity description.'},
    {key:'employees',label:'How many people work in this enterprise?',numeric:true,min:0,integer:true},
    {key:'pan_ready',label:'Is the relevant PAN available and accurate?',options:['Yes','Needs correction','Need guidance'],help:'Do not enter a PAN number here. The official portal handles PAN verification.'},
    {key:'gst_status',label:'What is the enterprise’s GST position?',options:['Registered','Not registered — need applicability review','Not required — already reviewed'],help:'GST requirements depend on the CGST Act. Udyam does not make every enterprise liable for GST by itself.'},
    {key:'aadhaar_ready',label:'Can the correct Aadhaar holder complete official verification?',options:['Yes','Need guidance'],help:'The proprietor, managing partner, karta or relevant authorised signatory must use the official route. Never share Aadhaar numbers or OTPs in these answers.'},
    ...contact,
  ],
  documents:[
    {type:'EXISTING_REGISTRATION',label:'Existing Udyam certificate',when:['existing_udyam','Yes'],optional:true},
    {type:'GST_CERTIFICATE',label:'GST registration certificate',when:['gst_status','Registered'],optional:true},
  ],
  source:'https://udyamregistration.gov.in/',
  notice:'RegisterBox provides paid application preparation and review. Confirm the assistance fee and scope with our team. You complete official identity verification and declarations yourself; never share OTPs or Aadhaar copies here.',
};
applicationCategories.company.questions=applicationCategories.company.questions.map(q=>q.key==='directors'?{...q,options:countOptions(2,15),min:2,max:15,integer:true}:q.key==='shareholders'?{...q,options:countOptions(2,200),min:2,max:200,integer:true}:q);
applicationCategories.company.questions.push({key:'alternate_name',label:'Alternative proposed company name'},{key:'authorized_capital',label:'Proposed authorized share capital in ₹',numeric:true,min:1},{key:'subscribed_capital',label:'Proposed subscribed share capital in ₹',numeric:true,min:1},{key:'foreign_participation',label:'Are any subscribers or directors foreign nationals / overseas entities?',options:yesNo},{key:'dsc_ready',label:'Do proposed signatories have a DSC?',options:['All','Some','None']},...contact);
applicationCategories.company.documents.push({type:'DIRECTOR_ADDRESS',label:'Residential address evidence for each director / subscriber'},{type:'OFFICE_UTILITY',label:'Registered-office utility bill (recent, matching the address)'},{type:'DIRECTOR_CONSENT',label:'Director consent / declarations for review'},{type:'FOREIGN_ID',label:'Foreign subscriber identity and authenticated evidence',when:['foreign_participation','Yes']});
applicationCategories.company.source='https://www.mca.gov.in/content/dam/mca/pdf/SPICEplus-and-linked-filings-FAQs-V3-20230122.pdf';
applicationCategories.company.notice='SPICe+ preparation: name approval, NIC classification, subscriber/share details, MOA/AOA, declarations and linked forms require completion and professional review on MCA. Uploads here do not incorporate a company.';
applicationCategories.llp.questions=applicationCategories.llp.questions.map(q=>q.key==='partners'?{...q,options:countOptions(2,50),min:2,max:50,integer:true}:q);
applicationCategories.llp.questions.push({key:'designated_partners',label:'Number of designated partners',options:countOptions(2,15),numeric:true,min:2,integer:true},{key:'contribution',label:'Total proposed contribution in ₹',numeric:true,min:1},{key:'foreign_participation',label:'Any foreign / body-corporate partners?',options:yesNo},...contact);
applicationCategories.llp.documents.push({type:'PARTNER_ADDRESS',label:'Partner residential address evidence'},{type:'OFFICE_UTILITY',label:'Recent registered-office utility bill'},{type:'PARTNER_CONSENT',label:'Designated-partner consent and subscriber details for review'});
applicationCategories.llp.source='https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_Form%20FiLLiP.pdf';
applicationCategories.llp.notice='FiLLiP preparation only. Partner contribution, designated-partner eligibility, subscriber sheet, name approval and subsequent LLP agreement filing require separate review.';
applicationCategories.food.questions.push(structure,{key:'food_route',label:'Which FoSCoS application are you preparing?',options:['Registration','State licence','Central licence','Need eligibility review'],help:'Do not choose solely by turnover. Kind of business, capacity, location and other criteria also matter.'},{key:'food_products',label:'Which food products / categories will you handle?'},{key:'daily_capacity',label:'Daily production capacity and unit',when:['food_activity','Manufacturing']},{key:'water_used',label:'Is water used as an ingredient or in processing?',options:yesNo},{key:'multi_state',label:'Will this business operate premises in more than one state?',options:yesNo},...contact);
applicationCategories.food.documents=applicationCategories.food.documents.filter(d=>d.type!=='PREMISES_LAYOUT');
applicationCategories.food.documents.push({type:'APPLICANT_PHOTO',label:'Applicant photograph'},{type:'GOVT_ID',label:'Government-issued applicant identity proof'},{type:'PREMISES_LAYOUT',label:'Manufacturing / processing premises layout',when:['food_activity','Manufacturing']},{type:'EQUIPMENT_LIST',label:'Manufacturing equipment and capacity list',when:['food_activity','Manufacturing']},{type:'WATER_REPORT',label:'Water analysis report for review where applicable',when:['water_used','Yes']});
applicationCategories.food.source='https://foscos.fssai.gov.in/apply-for-lic-and-reg';
applicationCategories.food.notice='FoSCoS documents vary by kind of business and registration/licence route. This is an intake checklist; eligibility and the portal-generated checklist must be confirmed before submission.';
// The shared application screen collects the business name first on web and mobile.
applicationCategories.gst_registration={
  title:'Apply for GST registration',
  questions:[
    {key:'address',label:'What is your full business address, including PIN code?',kind:'address'},
    {key:'activity',label:'What is the nature of your business?',help:'Tell us what you sell or what services you provide. For example: clothing shop, restaurant or software services.'},
    {key:'contact_mobile',label:'What is your phone number?',pattern:'^[6-9][0-9]{9}$',help:'Enter your 10-digit Indian mobile number.'},
    {key:'contact_email',label:'What is your email address?',pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'},
    {key:'premises',label:'Do you own or rent the business premises?',options:['Owned','Rented'],help:'This helps us show the correct property document to upload.'},
  ],
  documents:[
    {type:'AADHAAR_CARD',label:'Aadhaar card'},
    {type:'PAN_CARD',label:'PAN card'},
    {type:'PROMOTER_PHOTO',label:'Passport-size photo'},
    {type:'RENT_AGREEMENT',label:'Rental agreement',when:['premises','Rented']},
    {type:'OFFICE_UTILITY',label:'Electricity bill'},
    {type:'PREMISES_OWNER_PROOF',label:'Khata copy / property tax receipt (self-owned premises)',when:['premises','Owned']},
  ],
  notice:'Your details and documents will be saved for GST registration preparation. Our team will contact you if anything else is needed before submission.',
};
applicationCategories.retail.questions.push(structure,{key:'commencement',label:'Establishment commencement date · YYYY-MM-DD',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},{key:'establishment_type',label:'Establishment type',options:['Shop','Office / commercial establishment','Restaurant / eating house','Other']},...contact);
applicationCategories.retail.source='https://registration.shramsuvidha.gov.in/Users/stateintegration_acts/karnataka';
applicationCategories.retail.notice='Shops and Establishments requirements are state-specific. State labour portal forms, local trade permissions and supporting evidence need jurisdiction review; this is not a universal filing checklist.';
applicationCategories.retail.documents.push({type:'ESTABLISHMENT_PHOTO',label:'Establishment / signboard photograph for local checklist review'},{type:'EMPLOYER_ID',label:'Employer / authorized-person identity evidence'});
export function questionsFor(category:string,answers:Record<string,string>){
  const base=applicationCategories[category].questions.filter(q=>!q.when||answers[q.when[0]]===q.when[1]);
  if(category!=='company'&&category!=='llp')return base;
  const role=category==='company'?'director':'partner',count=Math.min(Number(answers[category==='company'?'directors':'partners'])||0,50);
  const people:ApplicationQuestion[]=[];
  for(let i=1;i<=count;i++){
    const prefix=`${role}_${i}`,title=`${role==='director'?'Director':'Partner'} ${i}`;
    people.push({key:prefix+'_name',label:title+' · full legal name'},{key:prefix+'_nationality',label:title+' · nationality',options:['Indian','Other']});
    if(answers[prefix+'_nationality']==='Indian')people.push({key:prefix+'_pan',label:title+' · PAN',pattern:'^[A-Z]{5}[0-9]{4}[A-Z]$'});
    else if(answers[prefix+'_nationality']==='Other')people.push({key:prefix+'_passport',label:title+' · passport number',help:'Foreign participation requires additional authentication and professional review.'});
    people.push({key:prefix+'_din_status',label:title+' · already has DIN / DPIN?',options:yesNo});
    if(answers[prefix+'_din_status']==='Yes')people.push({key:prefix+'_din',label:title+' · DIN / DPIN',pattern:'^[0-9]{8}$'});
    people.push({key:prefix+'_residence',label:title+' · complete residential address',help:'Use the address shown on the uploaded residential proof, including country and postal code.'});
  }
  return [...base,...people];
}
export function documentsFor(category:string,answers:Record<string,string>):ApplicationCategory['documents']{
  const base=applicationCategories[category].documents.filter(d=>!d.when||answers[d.when[0]]===d.when[1]);
  if(category!=='company'&&category!=='llp')return base;
  const role=category==='company'?'DIRECTOR':'PARTNER',count=Math.min(Number(answers[category==='company'?'directors':'partners'])||0,50);
  const personDocs=Array.from({length:count},(_,i)=>[{type:role+'_'+(i+1)+'_IDENTITY',label:`${role==='DIRECTOR'?'Director':'Partner'} ${i+1} · PAN / passport and identity evidence`},{type:role+'_'+(i+1)+'_ADDRESS',label:`${role==='DIRECTOR'?'Director':'Partner'} ${i+1} · residential address evidence`}]).flat();
  return [...base.filter(d=>![role+'_PAN',role+'_ID',role+'_ADDRESS'].includes(d.type)),...personDocs];
}
export function applicationFlowFor(category:string,answers:Record<string,string>){
  const questions=questionsFor(category,answers),documents=documentsFor(category,answers);
  const documentStep=questions.length+1,hasDocumentStep=category!=='udyam'||documents.length>0;
  return {questions,documents,documentStep,hasDocumentStep,reviewStep:documentStep+(hasDocumentStep?1:0)};
}
export function validateQuestion(q:ApplicationQuestion,answers:Record<string,string>){
  const value=answers[q.key]?.trim();if(q.kind==='address')return '';
  if(!value)return 'Answer this question to continue.';
  if(q.options&&!q.options.includes(value))return 'Select one of the available choices.';
  if(q.pattern&&!new RegExp(q.pattern).test(value))return 'Check the format of '+q.label.toLowerCase()+'.';
  if(q.key==='commencement'){const date=new Date(value+'T00:00:00Z');if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)return 'Enter a real calendar date.';}
  if(q.numeric&&(!/^\d+(\.\d{1,2})?$/.test(value)||(q.integer&&!Number.isInteger(Number(value)))||(q.min!==undefined&&Number(value)<q.min)||(q.max!==undefined&&Number(value)>q.max)))return 'Enter a valid amount or count within the allowed range.';
  if(q.key==='subscribed_capital'&&Number(value)>Number(answers.authorized_capital))return 'Subscribed capital cannot exceed authorized capital.';
  if(q.key==='designated_partners'&&Number(value)>Number(answers.partners))return 'Designated partners cannot exceed total partners.';
  return '';
}
export function categoryFromLegacyPrompt(prompt:string){const value=prompt.toLowerCase();if(/ud[yh]*am|msme/.test(value))return 'udyam';if(/gst/.test(value)&&/registration|register/.test(value))return 'gst_registration';if(/gst|return/.test(value))return 'gst';if(/private|company/.test(value))return 'company';if(/llp/.test(value))return 'llp';if(/food|kitchen/.test(value))return 'food';if(/retail|shop/.test(value))return 'retail';if(/manufactur/.test(value))return 'manufacturing';if(/online/.test(value))return 'online';if(/branch/.test(value))return 'branch';if(/existing|check/.test(value))return 'existing';return 'new';}
