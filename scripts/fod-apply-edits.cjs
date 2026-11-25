// FOD editing helper: exact, CRLF-safe string replacements (working-copy files are mixed CRLF/LF on Windows).
// Usage: node scripts/fod-apply-edits.cjs <file> <edits.cjs> [variant]
// edits.cjs exports [[oldString, newString], ...] written with LF; each oldString must match exactly once
// (a RegExp is also accepted). The file keeps its original line endings. Fails without writing on any miss.
// Prefer this (or the editor tool) over sed / `node -e` with backticks or \n escapes, which have corrupted edits before.
const fs=require('fs'),path=require('path');
const [file,mod]=process.argv.slice(2);
if(!file||!mod){console.error('usage: node scripts/fod-apply-edits.cjs <file> <edits.cjs> [variant]');process.exit(2);}
let s=fs.readFileSync(file,'utf8');const crlf=s.includes('\r\n');s=s.split('\r\n').join('\n');
for(const [a,b] of require(path.resolve(mod))){
 if(typeof a==='string'){const n=s.split(a).length-1;if(n!==1)throw Error('expected 1 match, got '+n+': '+a.slice(0,80));s=s.replace(a,()=>b);}
 else{if(!a.test(s))throw Error('regex miss '+a);s=s.replace(a,b);}
}
fs.writeFileSync(file,crlf?s.split('\n').join('\r\n'):s);console.log('ok',file,crlf?'crlf':'lf');
