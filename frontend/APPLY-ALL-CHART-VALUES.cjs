const fs=require('fs'); const path=require('path');
const root=process.cwd();
const pages=[
'src/pages/reports/agents/AgentPerformancePage.jsx',
'src/pages/reports/rma/GlobalRmaPage.jsx',
'src/pages/reports/rush-rma/RushRmaPage.jsx',
'src/pages/reports/satisfaction/SatisfactionPage.jsx',
'src/pages/reports/social/SocialPage.jsx',
'src/pages/reports/tickets/TicketAnalyticsPage.jsx'];
const componentFrom=path.join(__dirname,'src/components/VisibleChartValues.jsx');
const componentTo=path.join(root,'src/components/VisibleChartValues.jsx');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,`chart-values-backup-${stamp}`);
let patches=[];
for(const rel of pages){
 const full=path.join(root,rel); if(!fs.existsSync(full)) throw Error(`Missing: ${rel}`);
 const old=fs.readFileSync(full,'utf8');
 const re=/import\s*\{([\s\S]*?)\}\s*from\s*["']recharts["'];?/;
 const match=old.match(re);if(!match) throw Error(`Recharts import not found: ${rel}`);
 const parts=match[1].split(',').map(x=>x.trim()).filter(Boolean);
 const renamed=parts.filter(x=>!['Bar','Line','Pie'].includes(x));
 const selected=parts.filter(x=>['Bar','Line','Pie'].includes(x));
 const relImport=path.relative(path.dirname(full),componentTo).replace(/\\/g,'/');
 const spec=relImport.startsWith('.')?relImport:`./${relImport}`;
 const repl=(renamed.length?`import { ${renamed.join(', ')} } from "recharts";\n`:'')+
   (selected.length?`import { ${selected.join(', ')} } from "${spec}";`:'');
 patches.push({rel,full,old,newText:old.replace(re,repl)});
}
for(const p of patches){const dest=path.join(backup,p.rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,p.old);}
if(fs.existsSync(componentTo)){const dest=path.join(backup,'src/components/VisibleChartValues.jsx');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(componentTo,dest);}
fs.mkdirSync(path.dirname(componentTo),{recursive:true});fs.copyFileSync(componentFrom,componentTo);
for(const p of patches)fs.writeFileSync(p.full,p.newText);
console.log(`Patched ${patches.length} reports. Backup: ${backup}`);
