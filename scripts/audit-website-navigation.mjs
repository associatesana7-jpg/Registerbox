import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const build = process.env.REGISTERBOX_AUDIT_BUILD || '/tmp/registerbox-local-search-preview';
const walk = root => fs.readdirSync(root, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(root,entry.name)) : [path.join(root,entry.name)]);
const decode = value => value.replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"');
const pages = new Map(walk(build).filter(file=>file.endsWith('.html')).map(file=>{
  const relative=path.relative(build,file).replaceAll(path.sep,'/');
  const route='/'+relative.replace(/(?:\/)?index\.html$|\.html$/,'');
  return [route||'/',{file,html:fs.readFileSync(file,'utf8')}];
}));
const links=[], issues=[], controls=[];
for(const [route,{html}] of pages){
  for(const match of html.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/g)){
    const href=decode(/\bhref="([^"]*)"/.exec(match[1])?.[1]||'');
    const label=decode(match[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
    const link={page:route,label,href};links.push(link);
    if(!href||href==='#'||/undefined|javascript:/i.test(href)){issues.push({...link,problem:'Empty or placeholder destination'});continue;}
    if(/^(mailto:|tel:|https?:)/.test(href))continue;
    const url=new URL(href,'https://registerbox.test'+route);
    const target=pages.get(url.pathname.replace(/\/$/,'')||'/');
    if(!target){issues.push({...link,problem:'Internal route not exported'});continue;}
    if(url.hash&&!target.html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))issues.push({...link,problem:'Missing fragment target'});
  }
}
const files=[...walk('src/app'),...walk('src/components')].filter(file=>/\.tsx$/.test(file));
for(const file of files){
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){
    if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
      const tag=node.tagName.getText(source);
      const attrs=Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr=>[attr.name.getText(source),attr.initializer?.getText(source)||'true']));
      const isControl=['a','Link','button','Button','Pressable','NavTile','GstActionRow','summary','input','select','textarea'].includes(tag)||'onPress' in attrs||'onClick' in attrs;
      if(isControl){
        const line=source.getLineAndCharacterOfPosition(node.getStart()).line+1;
        const control={file,line,tag,label:attrs.title||attrs['aria-label']||attrs.accessibilityLabel||'',action:attrs.href||attrs.onPress||attrs.onClick||attrs.onChange||'',disabled:attrs.disabled||'',type:attrs.type||''};
        controls.push(control);
        if(['Button','NavTile','GstActionRow'].includes(tag)&&!attrs.onPress&&!attrs.disabled)issues.push({...control,problem:'Action component has no handler'});
        if(tag==='button'&&!attrs.onClick&&attrs.type!=='"submit"'&&attrs.type!=="'submit'"){
          let parent=node.parent,form=false;while(parent){if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(source)==='form'){form=true;break;}parent=parent.parent;}
          if(!form)issues.push({...control,problem:'Button has no click or form action'});
        }
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
}
const external=[...new Set(links.map(link=>link.href).filter(href=>/^https?:/.test(href)))];
const report={generatedAt:new Date().toISOString(),build,pages:pages.size,renderedLinks:links.length,sourceControls:controls.length,issues,links,controls,external};
fs.mkdirSync('docs/audits',{recursive:true});
fs.writeFileSync('docs/audits/website-navigation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:pages.size,renderedLinks:links.length,sourceControls:controls.length,externalDestinations:external.length,issues},null,2));
if(issues.length)process.exitCode=1;
