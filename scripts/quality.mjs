import {readFileSync,writeFileSync} from 'node:fs';
import {repairProject} from '../src/quality/preflight.js';
const args=process.argv.slice(2),path=args.shift();
if(!path||args.some(x=>x!=='--repair')||args.length>1)throw Error('Usage: npm run quality -- project.json [--repair]');
const input=JSON.parse(readFileSync(path,'utf8'));
const result=repairProject(input,null,{enabled:args.includes('--repair')});
// Inspection never overwrites user project. Rendering with repair requires explicit CLI flag.
console.log(JSON.stringify({report:result.report,proposedProject:result.project},null,2));
