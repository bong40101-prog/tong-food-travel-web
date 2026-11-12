const API='https://tongdorak-benefits.bong40101.workers.dev';
const SESSION='tongdorak:session:v1';
const guestPrefix='tong-food-travel:favorite:';
let session=read(SESSION),syncing=false;
function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
if(!session.token || session.expiresAt<=Date.now()){session={};localStorage.removeItem(SESSION)}
export function account(){return session.email||''}
export function isAdmin(){return Boolean(session.admin)}
const key=kind=>`tongdorak:${kind}:${account()}`;
function changed(){window.dispatchEvent(new Event('tong-account-changed'))}
export async function accountCall(path,method='GET',body){
 const response=await fetch(API+path,{method,headers:{Authorization:`Bearer ${session.token||''}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(response.status===401){session={};localStorage.removeItem(SESSION);changed();throw Error('로그인이 만료됐어요. 다시 로그인해 주세요.')}
 if(!response.ok)throw Error(response.status===429?'하루 제보 횟수를 초과했어요.':'서버 연결 또는 요청을 확인해 주세요.');
 return response.json();
}
export async function signIn(googleToken){
 const response=await fetch(API+'/session',{method:'POST',headers:{Authorization:`Bearer ${googleToken}`,'Content-Type':'application/json'},body:'{}'});
 if(!response.ok)throw Error('로그인을 확인하지 못했어요.');
 session=await response.json();write(SESSION,session);changed();await syncFavorites();return session;
}
export async function resume(){
 if(!account())return null;
 const me=await accountCall('/me');session={...session,...me};write(SESSION,session);changed();await syncFavorites();return session;
}
export async function signOut(){
 try{await accountCall('/session','DELETE')}catch{}session={};localStorage.removeItem(SESSION);changed();
}
export async function eraseAccount(){
 const savedKey=key('saved'),pendingKey=key('pending');await accountCall('/me','DELETE');
 localStorage.removeItem(savedKey);localStorage.removeItem(pendingKey);session={};localStorage.removeItem(SESSION);changed();
}
export function favoriteKeys(){
 if(account())return new Set(Object.keys(read(key('saved'))).filter(k=>k.startsWith('place:')).map(k=>guestPrefix+k.slice(6)));
 return new Set(Object.keys(localStorage).filter(k=>k.startsWith(guestPrefix)));
}
export function toggleAccountFavorite(place){
 const id=`${place.country.id}/${place.id}`;
 if(!account()){
  const saved=localStorage.getItem(guestPrefix+id)===null;
  if(saved)localStorage.setItem(guestPrefix+id,'1');else localStorage.removeItem(guestPrefix+id);
  return saved;
 }
 const data=read(key('saved')),item='place:'+id,saved=!Object.hasOwn(data,item);
 if(saved)data[item]={...place,savedAt:Date.now()};else delete data[item];
 write(key('saved'),data);
 const pending=read(key('pending'));pending[item]={key:item,deleted:!saved,value:saved?data[item]:null,operation:crypto.randomUUID()};write(key('pending'),pending);
 syncFavorites().catch(()=>{});return saved;
}
export async function syncFavorites(){
 if(!account()||syncing)return;syncing=true;const owner=account();
 try{
  do{
   const pending=read(key('pending')),batch=Object.values(pending).slice(0,100);
   const result=await accountCall('/saved',batch.length?'POST':'GET',batch.length?{changes:batch}:undefined);
   if(owner!==account())return;
   const remaining=read(key('pending'));
   for(const item of batch)if(remaining[item.key]?.operation===item.operation)delete remaining[item.key];
   write(key('pending'),remaining);
   const data={};for(const item of [...result.items,...Object.values(remaining)]){
    if(item.deleted)delete data[item.key];else data[item.key]=item.value;
   }
   write(key('saved'),data);changed();
  }while(Object.keys(read(key('pending'))).length);
 }finally{syncing=false}
}
window.addEventListener('online',()=>resume().catch(()=>{}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume().catch(()=>{})});
