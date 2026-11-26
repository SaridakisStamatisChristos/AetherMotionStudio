// Bounded exact rational arithmetic for equation checks (BigInt numerator/denominator). Never floating point: an
// equation is "true" only when every side reduces to the same rational number. Anything outside the exact subset
// (irrational roots, non-integer or huge exponents, gcd of non-integers, oversized numbers) is "unverifiable", never
// accepted. Grammar (after the TeX → ASCII conversion in math.js):
//   expr := term (('+'|'-') term)*   term := unary (('*'|'/') unary)*   unary := '-' unary | '+' unary | power
//   power := atom ('^' unary)?        atom := number | '(' expr ')' | 'sqrt' '(' expr ')' | 'gcd' '(' expr ',' expr ')'
// Limits: 200 characters, 120 tokens, 40 digits per number, nesting depth 24 (every recursion counts), |exponent| <= 64,
// 2000 digits in any intermediate numerator or denominator.
export const EXACT_LIMITS=Object.freeze({chars:200,tokens:120,digits:40,depth:24,exponent:64,resultDigits:2000});
class Unverifiable extends Error{}
const no=m=>{throw new Unverifiable(m);};
const abs=a=>a<0n?-a:a;
function bgcd(a,b){a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a;}
function q(n,d=1n){if(d===0n)no('division by zero (undefined)');if(d<0n){n=-n;d=-d;}const g=bgcd(n,d)||1n;n/=g;d/=g;
 if(String(abs(n)).length>EXACT_LIMITS.resultDigits||String(d).length>EXACT_LIMITS.resultDigits)no('numbers grow beyond '+EXACT_LIMITS.resultDigits+' digits');return {n,d};}
const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d),sub=(a,b)=>q(a.n*b.d-b.n*a.d,a.d*b.d),mul=(a,b)=>q(a.n*b.n,a.d*b.d),div=(a,b)=>{if(b.n===0n)no('division by zero (undefined)');return q(a.n*b.d,a.d*b.n);};
function pow(a,e){if(e.d!==1n)no('a non-integer exponent');if(abs(e.n)>BigInt(EXACT_LIMITS.exponent))no('an exponent larger than '+EXACT_LIMITS.exponent);
 let k=e.n<0n?-e.n:e.n,r=q(1n),base=a;while(k>0n){if(k&1n)r=mul(r,base);k>>=1n;if(k)base=mul(base,base);}if(e.n<0n){if(r.n===0n)no('division by zero (undefined)');r=q(r.d,r.n);}return r;}
// Integer square root, pure BigInt (second repair pass: the float start overflowed to Infinity for large n). Newton
// from 2^ceil(bits/2), which is >= sqrt(n), decreases monotonically to floor(sqrt(n)); bounded by the 2000-digit
// limit (about 6650 bits), so it needs well under 20 steps; the step cap is a safety net, not the stopping rule.
function isqrt(n){if(n<0n)return null;if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));
 for(let i=0;i<10000;i++){const y=(x+n/x)>>1n;if(y>=x)break;x=y;}
 if(x*x>n||(x+1n)*(x+1n)<=n)throw Error('isqrt did not converge');return x;}
function sqrt(a){if(a.n<0n)no('the square root of a negative number');const rn=isqrt(a.n),rd=isqrt(a.d);if(rn*rn!==a.n||rd*rd!==a.d)no('an irrational square root');return q(rn,rd);}
function gcd(a,b){if(a.d!==1n||b.d!==1n)no('gcd of non-integers');return q(bgcd(a.n,b.n));}
function tokens(s){if(s.length>EXACT_LIMITS.chars)no('longer than '+EXACT_LIMITS.chars+' characters');const out=[],re=/\s*(?:(\d+)(?:\.(\d+))?|(sqrt|gcd)|([-+*/^(),]))/y;let i=0;
 while(i<s.length){if(/^\s*$/.test(s.slice(i)))break;re.lastIndex=i;const m=re.exec(s);if(!m)no('not plain arithmetic');i=re.lastIndex;
  if(m[1]!==undefined){const digits=m[1]+(m[2]??'');if(digits.length>EXACT_LIMITS.digits)no('a number longer than '+EXACT_LIMITS.digits+' digits');out.push({t:'num',v:q(BigInt(digits),10n**BigInt((m[2]??'').length))});}
  else if(m[3])out.push({t:m[3]});else out.push({t:m[4]});
  if(out.length>EXACT_LIMITS.tokens)no('more than '+EXACT_LIMITS.tokens+' tokens');}
 return out;}
// Evaluates one side exactly. Throws Unverifiable for anything outside the exact subset.
function evaluate(s){const t=tokens(s);let i=0;const peek=()=>t[i]?.t,take=k=>{if(t[i]?.t!==k)no('not plain arithmetic');i++;};
 const deep=d=>{if(d>EXACT_LIMITS.depth)no('nested deeper than '+EXACT_LIMITS.depth);};
 function expr(d){deep(d);let a=term(d+1);while(peek()==='+'||peek()==='-'){const op=t[i++].t,b=term(d+1);a=op==='+'?add(a,b):sub(a,b);}return a;}
 function term(d){deep(d);let a=unary(d+1);while(peek()==='*'||peek()==='/'){const op=t[i++].t,b=unary(d+1);a=op==='*'?mul(a,b):div(a,b);}return a;}
 function unary(d){deep(d);if(peek()==='-'){i++;const a=unary(d+1);return q(-a.n,a.d);}if(peek()==='+'){i++;return unary(d+1);}return power(d+1);}
 function power(d){deep(d);const a=atom(d+1);if(peek()==='^'){i++;return pow(a,unary(d+1));}return a;}
 function atom(d){deep(d);const k=t[i];if(!k)no('not plain arithmetic');
  if(k.t==='num'){i++;return k.v;}
  if(k.t==='('){i++;const a=expr(d+1);take(')');return a;}
  if(k.t==='sqrt'){i++;take('(');const a=expr(d+1);take(')');return sqrt(a);}
  if(k.t==='gcd'){i++;take('(');const a=expr(d+1);take(',');const b=expr(d+1);take(')');return gcd(a,b);}
  no('not plain arithmetic');}
 const v=expr(0);if(i!==t.length)no('not plain arithmetic');return v;}
const show=v=>v.d===1n?String(v.n):v.n+'/'+v.d;
// sides: ASCII arithmetic strings. Returns {status:'true'|'false', values:[exact strings]} or {status:'unverifiable', reason}.
export function exactEquality(sides){
 try{const vals=sides.map(evaluate);const eq=vals.every(v=>v.n===vals[0].n&&v.d===vals[0].d);return {status:eq?'true':'false',values:vals.map(show)};}
 catch(e){if(e instanceof Unverifiable)return {status:'unverifiable',reason:e.message};throw e;}
}
