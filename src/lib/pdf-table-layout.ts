/** Geometry-only PDF table reconstruction. No PDF actions, scripts or links are executed. */
export type PositionedPdfText = { str: string; transform: readonly number[]; width: number; height: number };
export type PdfRule = { x1: number; y1: number; x2: number; y2: number };
export type PdfGridTable = { rows: string[][]; bounds: [number, number, number, number]; columnWidths: number[]; strippedSpreadsheetLabels: boolean };
type Segment = { at: number; start: number; end: number };
const EPS = 1.25;
const MAX_RULES = 2500;

function multiply(a: number[], b: ArrayLike<number>): number[] {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}

/** PDF.js 6 constructPath uses DrawOPS (move=0,line=1,curve=2,quadratic=3,close=4).
 * OPS codes are supplied by the installed parser; malformed/complex drawings fall back to text. */
export function pdfRulesFromOperators(list: { fnArray: ArrayLike<number>; argsArray: unknown[] }, ops: Record<string, number>): PdfRule[] {
  let matrix = [1,0,0,1,0,0];
  const stack: number[][] = [], rules: PdfRule[] = [];
  const point = (x: number, y: number): [number, number] => [matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
  function add(ax: number, ay: number, bx: number, by: number) {
    const [x1,y1]=point(ax,ay),[x2,y2]=point(bx,by);
    if (![x1,y1,x2,y2].every(Number.isFinite)) return;
    if (Math.abs(x1-x2)<=EPS && Math.abs(y1-y2)>10 || Math.abs(y1-y2)<=EPS && Math.abs(x1-x2)>10) rules.push({x1,y1,x2,y2});
  }
  if (list.fnArray.length > 250000) return [];
  for (let index=0;index<list.fnArray.length;index++) {
    const fn=list.fnArray[index], args=list.argsArray[index] as unknown[] | null;
    if (fn===ops.save) { if(stack.length>100) return []; stack.push([...matrix]); }
    else if(fn===ops.restore) matrix=stack.pop()??[1,0,0,1,0,0];
    else if(fn===ops.transform && args?.length===6 && args.every(n=>typeof n==='number'&&Number.isFinite(n))) matrix=multiply(matrix,args as number[]);
    else if(fn===ops.constructPath && args) {
      const [paint,data,minMax]=args as [number,ArrayLike<ArrayLike<number>>,ArrayLike<number>|null];
      if (!minMax || !data?.[0]) continue;
      const stroked=[ops.stroke,ops.closeStroke,ops.fillStroke,ops.eoFillStroke,ops.closeFillStroke,ops.closeEOFillStroke].includes(paint);
      const thin = Math.abs(minMax[2]-minMax[0]) <= EPS || Math.abs(minMax[3]-minMax[1]) <= EPS;
      // A filled cell background is not a table border.
      if(!stroked && !thin) continue;
      const path=data[0]; let x=0,y=0,startX=0,startY=0;
      if(path.length>50000) continue;
      for(let i=0;i<path.length;) {
        const op=path[i++];
        if(op===0) { x=path[i++];y=path[i++];startX=x;startY=y; }
        else if(op===1) { const nx=path[i++],ny=path[i++];add(x,y,nx,ny);x=nx;y=ny; }
        else if(op===2) { i+=4;x=path[i++];y=path[i++]; }
        else if(op===3) { i+=2;x=path[i++];y=path[i++]; }
        else if(op===4) { add(x,y,startX,startY);x=startX;y=startY; }
        else break;
      }
      if(rules.length>MAX_RULES) return [];
    }
  }
  return rules;
}

function consolidate(raw: Segment[]): Segment[] {
  const groups: Segment[][]=[];
  for(const line of raw.sort((a,b)=>a.at-b.at||a.start-b.start)) {
    const last=groups.at(-1);
    if(last && Math.abs(last[0].at-line.at)<=EPS) last.push(line); else groups.push([line]);
  }
  return groups.flatMap(group=>{
    const sorted=group.sort((a,b)=>a.start-b.start), merged: Segment[]=[];
    for(const line of sorted) { const last=merged.at(-1);if(last&&line.start<=last.end+EPS*2) last.end=Math.max(last.end,line.end);else merged.push({...line}); }
    return merged;
  });
}
function unique(values: number[]) { return values.sort((a,b)=>a-b).filter((n,i,a)=>!i||n-a[i-1]>EPS); }

function cellText(chunks: PositionedPdfText[]): string {
  const lines: {y:number;height:number;chunks:PositionedPdfText[]}[]=[];
  for(const chunk of chunks.sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])) {
    const height=Math.abs(chunk.height)||10, y=chunk.transform[5];
    const last=lines.at(-1);
    if(last&&Math.abs(last.y-y)<=Math.max(1,Math.min(last.height,height)*.35)) last.chunks.push(chunk);else lines.push({y,height,chunks:[chunk]});
  }
  return lines.map(line=>{
    let text='',end=-Infinity;
    for(const chunk of line.chunks.sort((a,b)=>a.transform[4]-b.transform[4])) {
      const gap=chunk.transform[4]-end;
      if(text&&gap>Math.max(.8,line.height*.12)&&!text.endsWith(' ')&&!chunk.str.startsWith(' ')) text+=' ';
      text+=chunk.str;end=chunk.transform[4]+chunk.width;
    }
    return text.trim();
  }).join('\n');
}

/** Connected ruled grids retain cell positions, including empty cells and wrapped text. */
export function extractRuledPdfTables(items: readonly PositionedPdfText[], rules: readonly PdfRule[]): PdfGridTable[] {
  if(items.length>40000||rules.length>MAX_RULES) return [];
  const vertical=consolidate(rules.filter(r=>Math.abs(r.x1-r.x2)<=EPS).map(r=>({at:(r.x1+r.x2)/2,start:Math.min(r.y1,r.y2),end:Math.max(r.y1,r.y2)})));
  const horizontal=consolidate(rules.filter(r=>Math.abs(r.y1-r.y2)<=EPS).map(r=>({at:(r.y1+r.y2)/2,start:Math.min(r.x1,r.x2),end:Math.max(r.x1,r.x2)})));
  if(vertical.length*horizontal.length>500000) return [];
  const parents=Array.from({length:vertical.length+horizontal.length},(_,i)=>i);
  const find=(n:number):number=>{while(parents[n]!==n){parents[n]=parents[parents[n]];n=parents[n];}return n;};
  for(let v=0;v<vertical.length;v++) for(let h=0;h<horizontal.length;h++) {
    const x=vertical[v],y=horizontal[h];
    if(x.at>=y.start-EPS&&x.at<=y.end+EPS&&y.at>=x.start-EPS&&y.at<=x.end+EPS) parents[find(v)]=find(vertical.length+h);
  }
  const groups=new Map<number,{v:Segment[];h:Segment[]}>();
  for(let i=0;i<parents.length;i++){const key=find(i), group=groups.get(key)??{v:[],h:[]};if(i<vertical.length) group.v.push(vertical[i]);else group.h.push(horizontal[i-vertical.length]);groups.set(key,group);}
  const tables:PdfGridTable[]=[];
  for(const group of groups.values()) {
    if(group.v.length<3||group.h.length<3)continue;
    // Ignore short decorative edges; require each column rule to cross most of the rows.
    const ys=unique(group.h.map(l=>l.at)).reverse();
    const top=ys[0],bottom=ys.at(-1)!;
    const xs=unique(group.v.filter(l=>l.end-l.start>=(top-bottom)*.65).map(l=>l.at));
    if(xs.length<3||xs.length>101||ys.length>5001||(xs.length-1)*(ys.length-1)>20000)continue;
    const cells:PositionedPdfText[][][]=Array.from({length:ys.length-1},()=>Array.from({length:xs.length-1},()=>[]));
    let assigned=0;
    for(const chunk of items) {
      if(!chunk.str.trim()||!Number.isFinite(chunk.width)||chunk.width<0)continue;
      const x=chunk.transform[4]+chunk.width/2,y=chunk.transform[5]+Math.abs(chunk.height)*.3;
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<xs[0]||x>xs.at(-1)!||y<bottom||y>top)continue;
      const c=xs.findIndex((n,i)=>i<xs.length-1&&x>=n-EPS&&x<xs[i+1]+EPS),r=ys.findIndex((n,i)=>i<ys.length-1&&y<=n+EPS&&y>ys[i+1]-EPS);
      if(r>=0&&c>=0){cells[r][c].push(chunk);assigned++;}
    }
    if(assigned<4)continue;
    let rows=cells.map(row=>row.map(cellText)),strippedSpreadsheetLabels=false;
    // Remove printed Excel A/B/C labels and row numbers only when both signals agree.
    const alphabet=(i:number)=>i<26?String.fromCharCode(65+i):'';
    const topLabels=items.filter(t=>t.str.trim()&&t.transform[5]>top&&t.transform[5]<top+45);
    const numbered=rows.length>=4&&rows.every((row,i)=>row[0]===String(i+1));
    const letters=xs.slice(1,-1).every((x,i)=>topLabels.some(t=>t.str.trim()===alphabet(i)&&t.transform[4]+t.width/2>=x&&t.transform[4]+t.width/2<xs[i+2]));
    if(numbered&&letters){rows=rows.map(row=>row.slice(1));strippedSpreadsheetLabels=true;}
    // A completely empty decorative band does not become an empty worksheet row.
    while(rows.length&&!rows[0].some(Boolean))rows.shift();
    while(rows.length&&!rows.at(-1)!.some(Boolean))rows.pop();
    tables.push({rows,bounds:[xs[0],bottom,xs.at(-1)!,top],columnWidths:xs.slice(1).map((x,i)=>x-xs[i]).slice(strippedSpreadsheetLabels?1:0),strippedSpreadsheetLabels});
  }
  return tables.sort((a,b)=>b.bounds[3]-a.bounds[3]||a.bounds[0]-b.bounds[0]);
}
