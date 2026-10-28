import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const moduleUrl=url=>{const source=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from ['"]\.\/pdf-table-layout['"]/g,()=>`from '${moduleUrl(new URL('../src/lib/pdf-table-layout.ts',import.meta.url))}'`);return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;};
const { imageWordsToTables: layout,rasterTableRules: rules }=await import(moduleUrl(new URL('../src/lib/image-table-layout.ts',import.meta.url)));
const word=(text,left,top,width=30)=>({text,left,top,right:left+width,bottom:top+12,confidence:95});
test('image table spacing preserves words within cells, empty values and row order',()=>{
 const result=layout([word('Item',20,20),word('Amount',220,20),word('Office',20,50),word('paper',58,50),word('100.00',220,50),word('Stapler',20,80)],120,[]);
 assert.deepEqual(result.tables[0],[['Item','Amount'],['Office paper','100.00'],['Stapler','']]);assert.equal(result.method,'spacing');
});
test('empty OCR never becomes a blank successful workbook',()=>{assert.throws(()=>layout([],100,[]),/No readable/);});
test('raster grid detection rejects shaded bands but reconstructs actual cells',()=>{
 const width=400,height=250,data=new Uint8ClampedArray(width*height*4).fill(255);
 const black=(x,y)=>{const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=80;};
 for(const x of [10,180,390])for(let y=10;y<=240;y++)black(x,y);
 for(const y of [10,60,120,180,240])for(let x=10;x<=390;x++)black(x,y);
 const result=layout([word('Name',20,25),word('Amount',200,25),word('Paper',20,80),word('12.00',300,80)],height,rules(data,width,height));
 assert.equal(result.method,'borders');assert.deepEqual(result.tables[0].slice(0,2),[['Name','Amount'],['Paper','12.00']]);
});
test('OCR confidence and oversized data are visible and bounded',()=>{
 const result=layout([{...word('Review',20,20),confidence:30}],100,[]);assert.equal(result.lowConfidenceWords,1);
 assert.throws(()=>rules(new Uint8ClampedArray(4),5000,5000),/oversized/);
 assert.throws(()=>layout(Array(20001).fill(word('x',1,1)),100,[]),/too many words/);
});
