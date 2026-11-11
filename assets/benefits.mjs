const API='https://tongdorak-benefits.bong40101.workers.dev';
const CLIENT='180927082101-ufclnset1vqd2maq488mvqm4jlpj5d1c.apps.googleusercontent.com';
let token='';
let busy=false;
const $=id=>document.getElementById(id);
function notice(value){ $('benefits-status').textContent=value; }
async function call(path,method='GET',body){
  const response=await fetch(API+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('서버 연결 또는 인증이 만료되었습니다. 다시 로그인해 주세요.');
  return response.json();
}
function clear(){token='';$('benefits-admin').hidden=true;$('benefits-logout').hidden=true;$('benefits-delete').hidden=true;document.querySelectorAll('[data-promotion]').forEach(e=>e.hidden=false);$('benefits-members').replaceChildren();}
async function members(){const data=await call('/admin/members');$('benefits-members').replaceChildren(...data.members.map(email=>{const li=document.createElement('li');li.textContent=email;return li;}));}
async function signedIn(result){
 if(busy)return;busy=true;
 try { clear();token=result.credential;const me=await call('/me');document.querySelectorAll('[data-promotion]').forEach(e=>e.hidden=me.adFree);
  $('benefits-logout').hidden=false;$('benefits-delete').hidden=false;$('benefits-admin').hidden=!me.admin;
  notice(`${me.email} · ${me.adFree?'광고 제거 적용 중':'등록된 광고 제거 혜택 없음'}`);if(me.admin)await members();
 }catch(e){clear();notice(e.message);}finally{busy=false;}
}
if($('benefits-google')){
 $('benefits-logout').addEventListener('click',()=>{if(busy)return;clear();window.google?.accounts.id.disableAutoSelect();notice('로그아웃했습니다. 같은 계정으로 로그인하면 혜택이 복구됩니다.');});
 $('benefits-add').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;try{await call('/admin/members','POST',{email:$('benefits-email').value.trim()});await members();notice('등록했습니다. 대상자는 다시 로그인하면 혜택이 적용됩니다.');}catch(e){notice(e.message);}finally{busy=false;}});
 $('benefits-delete').addEventListener('click',async()=>{if(busy || !confirm('계정 연결과 영구 광고 제거 혜택을 삭제할까요? 저장한 장소는 브라우저에 남습니다.'))return;busy=true;try{await call('/me','DELETE');clear();notice('계정 연결과 혜택 정보를 삭제했습니다.');}catch(e){notice(e.message);}finally{busy=false;}});
 const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
 script.onload=()=>{google.accounts.id.initialize({client_id:CLIENT,callback:signedIn,auto_select:false});google.accounts.id.renderButton($('benefits-google'),{theme:'outline',size:'large',text:'signin_with',locale:'ko'});};
 script.onerror=()=>notice('Google 로그인을 불러오지 못했습니다. 네트워크를 확인해 주세요.');document.head.append(script);
}
