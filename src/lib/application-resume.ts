import { questionsFor, validateQuestion } from '@/data/application-categories';
import { validateAddress } from '@/data/india-address';

// Recompute conditional questions from the saved answers, never a stale question index.
export function applicationResumeStep(category:string,answers:Record<string,string>,name:string){
  if(!name.trim())return 0;
  const questions=questionsFor(category,answers);
  const index=questions.findIndex(question=>Boolean(question.kind==='address'?validateAddress(answers):validateQuestion(question,answers)));
  return index<0?questions.length+1:index+1;
}
