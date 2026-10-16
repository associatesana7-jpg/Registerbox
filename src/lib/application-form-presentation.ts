import type { TextInputProps } from 'react-native';
import type { ApplicationQuestion } from '@/data/application-categories';

// Presentation only: questionnaire requirements and validation remain in application-categories.
export function applicationInputProps(question: ApplicationQuestion): TextInputProps {
  const key=question.key.toLowerCase();
  if(key.includes('email'))return {keyboardType:'email-address',autoComplete:'email',autoCapitalize:'none',autoCorrect:false};
  if(key.includes('mobile')||key.includes('phone'))return {keyboardType:'phone-pad',autoComplete:'tel',maxLength:10,autoCorrect:false};
  if(key.endsWith('_pan')||key==='pan')return {autoCapitalize:'characters',autoCorrect:false,maxLength:10};
  if(key.endsWith('_din'))return {keyboardType:'number-pad',autoCorrect:false,maxLength:8};
  if(question.numeric)return {keyboardType:question.integer?'number-pad':'decimal-pad',autoCorrect:false};
  if(key==='activity'||key.includes('residence')||key==='food_products')return {multiline:true,textAlignVertical:'top',autoCapitalize:'sentences'};
  return {autoCapitalize:'sentences'};
}

export function applicationPhase(step:number,documentStep:number,reviewStep:number){
  if(step===0)return 0;
  if(step<documentStep)return 1;
  if(step===documentStep)return 2;
  return step>=reviewStep?3:1;
}
