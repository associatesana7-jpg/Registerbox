export const indianStates=['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
export type PostalLocation={name:string;state:string;district:string};
export function parsePostalLocations(value:unknown,pincode:string):PostalLocation[]{
  if(!Array.isArray(value)||value[0]?.Status!=='Success'||!Array.isArray(value[0]?.PostOffice))throw Error('No postal locations found. Check the PIN or enter the address manually.');
  const result=value[0].PostOffice.filter((r:Record<string,unknown>)=>r.Pincode===pincode&&typeof r.Name==='string'&&typeof r.State==='string'&&typeof r.District==='string').map((r:Record<string,string>)=>({name:r.Name.trim(),state:r.State.trim(),district:r.District.trim()}));
  if(!result.length)throw Error('Postal lookup did not return matching locations.');return result;
}
export function validateAddress(a:Record<string,string>){
  if(!/^[1-9]\d{5}$/.test(a.pincode||''))return 'Enter a valid six-digit PIN code.';
  if(!indianStates.includes(a.state))return 'Select the state or union territory.';
  if(!a.district?.trim()||!a.city?.trim()||!a.address_line_1?.trim())return 'Complete district, city/town and the building/street address.';
  if(a.address_confirmed!=='Yes')return 'Confirm this address after checking it against your premises proof.';
  return '';
}
