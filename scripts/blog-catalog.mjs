import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';

// Load repository-owned blog data for build scripts without a browser bundle.
const modules = new Map();
export function readBlogModule(filename) {
  const file = path.resolve(filename);
  if (modules.has(file)) return modules.get(file);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const output = {};
  modules.set(file, output);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const requireLocal = name => {
    if (!name.startsWith('.')) throw new Error(`Unexpected blog data dependency: ${name}`);
    const base = path.resolve(path.dirname(file), name);
    const target = [base, `${base}.ts`, `${base}.json`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target) throw new Error(`Missing blog data: ${name}`);
    return readBlogModule(target);
  };
  new Function('exports', 'require', code)(output, requireLocal);
  return output;
}
export function readLocalizedBlogCatalog() { return readBlogModule('src/data/blog/localized.ts'); }
export function readBlogArticles() {
  return ['fast-gst-guide','gstr3b-process-guide','director-employer-guides','shop-process-guide','startup-guides','payroll-food-guides','gst-food-guides','business-guides'].flatMap(name=>{
    const code=ts.transpileModule(fs.readFileSync(`src/data/blog/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const output={};new Function('exports',code)(output);
    return Object.values(output)[0];
  });
}
