// DUAL-03 bounded expression parser (allowlisted grammar; never eval or Function). Used by function plots and by the
// arithmetic check of equations. Grammar:
//   expr  := term (('+'|'-') term)*        term := unary (('*'|'/') unary)*
//   unary := ('+'|'-') unary | power        power := atom ('^' unary)?       (right-associative)
//   atom  := number | 'x' | const | func '(' expr ')' | 'gcd' '(' expr ',' expr ')' | '(' expr ')'
// Numbers: digits with an optional decimal part. Constants: pi, e. Functions: sin cos tan asin acos atan sqrt abs exp
// ln log (base 10) floor ceil. Limits: 160 characters, 120 tokens, nesting depth 24. Evaluation returns a number or
// NaN; callers decide what a non-finite value means (a plot gap or a rejection), never silently.
export const EXPR_LIMITS=Object.freeze({chars:160,tokens:120,depth:24});
const FUNCS=Object.freeze({sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,ln:Math.log,log:Math.log10,floor:Math.floor,ceil:Math.ceil});
const CONSTS=Object.freeze({pi:Math.PI,e:Math.E});
const fail=(p,m)=>{throw Error(p+': '+m)};
function tokens(src,p){
 if(typeof src!=='string'||!src.trim()||src.length>EXPR_LIMITS.chars)fail(p,'expression of 1–'+EXPR_LIMITS.chars+' characters required');
 const out=[],re=/\s*(?:(\d+(?:\.\d+)?)|([A-Za-z]+)|([-+*/^(),]))/y;let i=0;
 while(i<src.length){if(/^\s*$/.test(src.slice(i)))break;re.lastIndex=i;const m=re.exec(src);if(!m)fail(p,'unexpected character "'+src[i].replace(/\s/,' ')+'" at '+i);i=re.lastIndex;
  if(m[1])out.push({t:'num',v:Number(m[1])});else if(m[2]){const w=m[2];if(w==='x')out.push({t:'x'});else if(Object.hasOwn(CONSTS,w))out.push({t:'num',v:CONSTS[w]});else if(Object.hasOwn(FUNCS,w)||w==='gcd')out.push({t:'fn',v:w});else fail(p,'unknown name "'+w+'" (allowed: x, pi, e, '+Object.keys(FUNCS).join(', ')+', gcd)');}
  else out.push({t:m[3]});
  if(out.length>EXPR_LIMITS.tokens)fail(p,'more than '+EXPR_LIMITS.tokens+' tokens');}
 return out;
}
// Parses to a small closure tree. Returns {eval(x), usesX}.
export function parseExpr(src,p='expression'){
 const t=tokens(src,p);let i=0,usesX=false;
 const peek=()=>t[i]?.t,take=k=>{if(t[i]?.t!==k)fail(p,'expected "'+k+'"'+(t[i]?' before token '+(i+1):' at the end'));return t[i++];};
 const gcd=(a,b)=>{if(!Number.isInteger(a)||!Number.isInteger(b))return NaN;a=Math.abs(a);b=Math.abs(b);let n=0;while(b){[a,b]=[b,a%b];if(++n>10000)return NaN;}return a;};
 function expr(d){if(d>EXPR_LIMITS.depth)fail(p,'nesting deeper than '+EXPR_LIMITS.depth);let a=term(d);while(peek()==='+'||peek()==='-'){const op=t[i++].t,b=term(d),l=a;a=op==='+'?x=>l(x)+b(x):x=>l(x)-b(x);}return a;}
 function term(d){let a=unary(d);while(peek()==='*'||peek()==='/'){const op=t[i++].t,b=unary(d),l=a;a=op==='*'?x=>l(x)*b(x):x=>l(x)/b(x);}return a;}
 function unary(d){if(d>EXPR_LIMITS.depth)fail(p,'nesting deeper than '+EXPR_LIMITS.depth);if(peek()==='-'){i++;const a=unary(d+1);return x=>-a(x);}if(peek()==='+'){i++;return unary(d+1);}return power(d);}
 function power(d){const a=atom(d);if(peek()==='^'){i++;const b=unary(d+1);return x=>a(x)**b(x);}return a;}
 function atom(d){const k=t[i];if(!k)fail(p,'unexpected end of expression');
  if(k.t==='num'){i++;return ()=>k.v;}
  if(k.t==='x'){i++;usesX=true;return x=>x;}
  if(k.t==='('){i++;const a=expr(d+1);take(')');return a;}
  if(k.t==='fn'){i++;take('(');const a=expr(d+1);if(k.v==='gcd'){take(',');const b=expr(d+1);take(')');return x=>gcd(a(x),b(x));}take(')');const f=FUNCS[k.v];return x=>f(a(x));}
  fail(p,'unexpected "'+k.t+'"');}
 const root=expr(0);if(i!==t.length)fail(p,'unexpected "'+t[i].t+'" after the expression');
 return {usesX,eval:x=>{const v=root(x);return typeof v==='number'?v:NaN;}};
}
