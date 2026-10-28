import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const js = ts.transpileModule(readFileSync(new URL('../src/lib/pdf-table-layout.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { extractRuledPdfTables: extract, pdfRulesFromOperators: rulesFrom } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const text=(str,x,y,width=30,height=10)=>({str,width,height,transform:[height,0,0,height,x,y]});
function grid(xs,ys) { return [...xs.map(x=>({x1:x,y1:ys.at(-1),x2:x,y2:ys[0]})),...ys.map(y=>({x1:xs[0],y1:y,x2:xs.at(-1),y2:y}))]; }

test('20 columns keep centred headers and variable-width right-aligned values in the same columns',()=>{
  const xs=Array.from({length:21},(_,i)=>40+i*70),ys=Array.from({length:22},(_,i)=>800-i*25);
  const items=[];
  for(let c=0;c<20;c++)items.push(text(`Column ${c+1}`,xs[c]+10,ys[0]-15,50));
  for(let r=1;r<=20;r++)for(let c=0;c<20;c++){const s=`${r*100+c}.00`;items.push(text(s,xs[c+1]-5-s.length*4,ys[r]-15,s.length*4));}
  const tables=extract(items,grid(xs,ys));assert.equal(tables.length,1);assert.equal(tables[0].rows.length,21);assert.equal(tables[0].rows[0].length,20);
  for(let r=1;r<=20;r++)for(let c=0;c<20;c++)assert.equal(tables[0].rows[r][c],`${r*100+c}.00`);
});
test('empty cells and multiline text retain exact row/column position',()=>{
  const items=[text('Name',15,185),text('Amount',115,185),text('Office',15,155),text('paper',15,142),text('12.00',155,150,30),text('Stapler',15,115)];
  assert.deepEqual(extract(items,grid([10,100,200],[200,170,130,100]))[0].rows,[['Name','Amount'],['Office\npaper','12.00'],['Stapler','']]);
});
test('separate tables are not mixed and external titles are not shifted into table columns',()=>{
  const rules=[...grid([10,80,160],[300,280,260]),...grid([10,90,200],[150,130,110])];
  const tables=extract([text('Title',20,340),text('A',20,285),text('B',100,285),text('1',20,265),text('2',100,265),text('C',20,135),text('D',100,135),text('3',20,115),text('4',100,115)],rules);
  assert.equal(tables.length,2);assert.deepEqual(tables[0].rows,[['A','B'],['1','2']]);assert.deepEqual(tables[1].rows,[['C','D'],['3','4']]);
});
test('printed spreadsheet row numbers are removed only together with matching column letters',()=>{
  const xs=[10,35,100,180],ys=[300,275,250,225,200],rules=grid(xs,ys);
  const items=[text('A',60,310,8),text('B',130,310,8)];
  for(let r=0;r<4;r++){items.push(text(String(r+1),15,ys[r]-15,8),text(r?'INV-000'+r:'Invoice',40,ys[r]-15),text(r?'123.00':'Amount',120,ys[r]-15));}
  const table=extract(items,rules)[0];assert.equal(table.strippedSpreadsheetLabels,true);assert.equal(table.rows[0].length,2);assert.equal(table.rows[1][0],'INV-0001');
  assert.equal(extract(items.filter(t=>t.str!=='B'),rules)[0].rows[0].length,3);
});
test('PDF drawing transforms and save/restore are applied to line coordinates',()=>{
  const ops={save:1,restore:2,transform:3,constructPath:4,stroke:20,closeStroke:21,fill:23};
  const list={fnArray:[1,3,4,2,4],argsArray:[[],[2,0,0,2,10,20],[20,[new Float32Array([0,1,2,1,1,52])],[1,2,1,52]],[],[20,[new Float32Array([0,100,100,1,180,100])],[100,100,180,100]]]};
  assert.deepEqual(rulesFrom(list,ops),[{x1:12,y1:24,x2:12,y2:124},{x1:100,y1:100,x2:180,y2:100}]);
});
test('non-grid drawings, corrupt coordinates and resource-heavy drawings fall back safely',()=>{
  assert.deepEqual(extract([text('Hi',20,20)],[]),[]);
  assert.deepEqual(extract([text('Bad',NaN,20)],grid([0,100,200],[200,100,0])),[]);
  assert.deepEqual(rulesFrom({fnArray:Array(250001).fill(4),argsArray:[]},{constructPath:4}),[]);
});
