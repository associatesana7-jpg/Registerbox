import fs from 'node:fs';
import ts from 'typescript';
export function readBlogArticles() {
  return ['fast-gst-guide','gstr3b-process-guide','director-employer-guides','shop-process-guide','startup-guides','payroll-food-guides','gst-food-guides','business-guides'].flatMap(name=>{
    const code=ts.transpileModule(fs.readFileSync(`src/data/blog/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const output={};new Function('exports',code)(output);
    return Object.values(output)[0];
  });
}
