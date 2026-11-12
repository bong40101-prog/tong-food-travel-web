// Compare complete location components, never substrings (e.g. 뉴욕/뉴욕주).
export function locationLabel(...parts) {
 const seen=new Set();
 return parts.flatMap(value=>String(value??'').split(/[·ㆍ•]/u))
  .map(value=>value.trim()).filter(value=>{
   if(!value)return false;
   const key=value.normalize('NFKC').replace(/\s+/gu,'').toLocaleLowerCase();
   if(seen.has(key))return false;
   seen.add(key);return true;
  }).join(' · ');
}
