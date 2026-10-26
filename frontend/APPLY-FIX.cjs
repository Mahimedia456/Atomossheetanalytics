const fs=require('fs'),path=require('path');
const root=process.cwd();
const files={chart:path.join(root,'src/components/VisibleChartValues.jsx'), page:path.join(root,'src/pages/reports/rma/GlobalRmaPage.jsx'), pdf:path.join(root,'src/utils/dashboardPdfExport.js')};
for (const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) throw Error(`Required ${name} file not found: ${p}`);
const original=Object.fromEntries(Object.entries(files).map(([k,p])=>[k,fs.readFileSync(p,'utf8')]));
let {chart,page,pdf}=original;
if (!chart.includes('export function Bar') || !chart.includes('LabelList')) throw Error('Unknown VisibleChartValues.jsx baseline; no files changed');
if (!page.includes('title="Stock Sent by Device Name"')) throw Error('Stock chart anchor missing; no files changed');
const begin=page.indexOf('title="Stock Sent by Device Name"'), end=page.indexOf('</BarChart>',begin);
if(end<0) throw Error('Stock chart closing tag missing; no changes');
let segment=page.slice(begin,end);
if(!['RStock','BStock','OtherStock'].every(k=>segment.includes(`dataKey="${k}"`))) throw Error('Stock chart keys mismatch; no changes');
// No value labels inside stacked segments. Keep explicit StockStackValues on the last Bar only.
for(const key of ['RStock','BStock','OtherStock']){
 const r=new RegExp(`(dataKey="${key}")(?!\\s+showValueLabels=)`, 'g');
 segment=segment.replace(r,'$1\n              showValueLabels={false}');
}
// Only remove inline StockStackValues/StockStackBadges label renderers in this chart; use one explicit endpoint label.
segment=segment.replace(/<LabelList\s+content=\{<StockStackBadges\s*\/?>\}\s*\/>/g,'');
segment=segment.replace(/<StockStackValues\s*\/>/g,'');
// insert after final stacked Bar's children, do not modify other bars.
const lastBar=segment.lastIndexOf('<Bar');
if(lastBar<0) throw Error('Missing final Bar');
const lastSlice=segment.slice(lastBar);
if(!lastSlice.includes('dataKey="OtherStock"')) throw Error('Final bar is not OtherStock; no changes');
if(lastSlice.includes('/>') && !lastSlice.includes('</Bar>')) {
 const closeIndex=segment.indexOf('/>',lastBar);
 if(closeIndex<0) throw Error('Missing last Bar closing');
 segment=segment.slice(0,closeIndex)+' >\n              <StockStackValues />\n            </Bar>'+segment.slice(closeIndex+2);
} else if(lastSlice.includes('</Bar>')) {
 const closeIndex=segment.indexOf('</Bar>',lastBar);
 segment=segment.slice(0,closeIndex)+'\n              <StockStackValues />\n            '+segment.slice(closeIndex);
} else throw Error('Last Bar syntax unrecognized');
// Ensure only this chart uses the static endpoint label and reserve space.
segment=segment.replace(/margin=\{\{([^}]+)\}\}/,(all,margins)=>{
 const match=margins.match(/right:\s*(\d+)/);
 if(!match)return all;
 return all.replace(match[0],`right: ${Math.max(220,Number(match[1]))}`);
});
page=page.slice(0,begin)+segment+page.slice(end);
if(!page.includes('import { StockStackValues }')&&!/import\s*\{[^}]*StockStackValues[^}]*\}\s*from/.test(page)){
 const imp=/import\s*\{([^}]*)\}\s*from\s*["']([^"']*VisibleChartValues\.jsx)["'];?/;
 if(!imp.test(page))throw Error('VisibleChartValues import unrecognized; no changes');
 page=page.replace(imp,(full,names,mod)=>`import { ${names.trim().replace(/,\s*$/, '')}, StockStackValues } from "${mod}";`);
}
// Replace StockStackValues implementation, keep all other exports and report logic intact.
const replacement=`export function StockStackValues({ series = [\n  { key: "RStock", color: "#00dcc5" },\n  { key: "BStock", color: "#38bdf8" },\n  { key: "OtherStock", color: "#71717a" },\n] }) {\n  return <LabelList content={(props) => {\n    const { x, y, width, height, payload } = props;\n    if (!payload || ![x,y,width,height].every(v=>Number.isFinite(Number(v)))) return null;\n    const values = series.map(item=>({...item,value:Number(payload[item.key])})).filter(item=>Number.isFinite(item.value)&&item.value>0);\n    if (!values.length) return null;\n    const lastEnd=Number(x)+Number(width);\n    const cy=Number(y)+Number(height)/2;\n    let cursor=lastEnd+10;\n    return <g pointerEvents="none" className="pdf-visible-value pdf-stock-end-values">\n      {values.map((item)=>{\n        const text=item.value.toLocaleString('en-US',{maximumFractionDigits:2});\n        const squareX=cursor;\n        cursor += 12 + Math.max(16,text.length*7) + 8;\n        return <g key={item.key}>\n          <rect x={squareX} y={cy-4} width={8} height={8} rx={1} fill={item.color} />\n          <text x={squareX+12} y={cy} dominantBaseline="central" textAnchor="start" fill="#ffffff" fontSize={11} fontWeight={800}>{text}</text>\n        </g>;\n      })}\n    </g>;\n  }}/>;\n}\n`;
const start=chart.indexOf('export function StockStackValues');
if(start>=0){
 // StockStackValues is the last export in historical checkpoints. Fail closed if not.
 const later=chart.slice(start+'export function StockStackValues'.length);
 if(/\nexport\s+(function|const|class)\s+/.test(later))throw Error('StockStackValues not last export; no changes');
 chart=chart.slice(0,start)+replacement;
}else chart+='\n'+replacement;
// Disable automatic per-segment LabelList for all stacked bars; never overlay values inside a stack.
chart=chart.replace(/export function Bar\(\{ children, labelList, \.\.\.props \}\) \{[\s\S]*?\n\}/,`export function Bar({ children, showValueLabels = true, ...props }) {\n  const isStacked = Boolean(props.stackId);\n  const color = typeof props.fill === "string" ? props.fill : "#00dcc5";\n  return <BaseBar {...props}>\n    {children}\n    {!isStacked && showValueLabels !== false ? <LabelList dataKey={props.dataKey} content={(p) => <OutsideValue {...p} color={color} stacked={false} />} /> : null}\n  </BaseBar>;\n}`);
// The previous SVG-label mirror duplicates/offsets labels in PDF. Strip its invocation, leaving capture otherwise intact.
if(pdf.includes('const restoreLabels = mirrorSvgLabels(node);')) {
 pdf=pdf.replace('const restoreLabels = mirrorSvgLabels(node);','');
 pdf=pdf.replace(/\s*finally\s*\{\s*restoreLabels\(\);\s*\}/,'');
 pdf=pdf.replace(/let dataUrl;\s*try\s*\{\s*dataUrl = await /,'const dataUrl = await ');
 pdf=pdf.replace(/\n  \}\s*return \{ dataUrl, width:/,'\n  return { dataUrl, width:');
}
const backup=path.join(root,'ATOMOS_STACK_PDF_BACKUP_'+new Date().toISOString().replace(/[:.]/g,'-'));
for(const [k,p] of Object.entries(files)){
 const dest=path.join(backup,path.relative(root,p));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);
}
for(const [k,p] of Object.entries(files))fs.writeFileSync(p,{chart,page,pdf}[k]);
console.log('Updated current sources. Backup: '+backup);
console.log('Run npm run build. If build fails, restore backed-up files before deploying.');
