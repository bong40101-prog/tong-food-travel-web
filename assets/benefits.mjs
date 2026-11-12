import { account, accountCall as serverCall, signIn, signOut, resume, eraseAccount } from './account-store.mjs';
import { setupCommunity } from './community.mjs';
const API='https://tongdorak-benefits.bong40101.workers.dev';
const CLIENT='180927082101-ufclnset1vqd2maq488mvqm4jlpj5d1c.apps.googleusercontent.com';
let token='';
let busy=false;
const $=id=>document.getElementById(id);
function notice(value){ $('benefits-status').textContent=value; }
async function call(path,method='GET',body){return serverCall(path,method,body);}

function clear(){token='';$('benefits-admin').hidden=true;$('benefits-logout').hidden=true;$('benefits-delete').hidden=true;document.querySelectorAll('[data-promotion]').forEach(e=>e.hidden=false);$('benefits-members').replaceChildren();}
async function members(){const data=await call('/admin/members');$('benefits-members').replaceChildren(...data.members.map(email=>{const li=document.createElement('li');li.textContent=email;return li;}));}
async function signedIn(result){
 if(busy)return;busy=true;
 try { clear();const me=await signIn(result.credential);document.querySelectorAll('[data-promotion]').forEach(e=>e.hidden=me.adFree);
  $('benefits-logout').hidden=false;$('benefits-delete').hidden=false;$('benefits-admin').hidden=!me.admin;
  notice(`${me.email} · ${me.adFree?'광고 제거 적용 중':'등록된 광고 제거 혜택 없음'}`);if(me.admin)await members();
 }catch(e){clear();notice(e.message);}finally{busy=false;}
}
if($('benefits-google')){
 $('benefits-logout').addEventListener('click',async()=>{if(busy)return;await signOut();clear();window.google?.accounts.id.disableAutoSelect();notice('로그아웃했습니다. 같은 계정으로 로그인하면 혜택이 복구됩니다.');});
 $('benefits-add').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;try{await call('/admin/members','POST',{email:$('benefits-email').value.trim()});await members();notice('등록했습니다. 대상자는 다시 로그인하면 혜택이 적용됩니다.');}catch(e){notice(e.message);}finally{busy=false;}});
 $('benefits-delete').addEventListener('click',async()=>{if(busy || !confirm('계정 연결·혜택·계정에 저장된 찜과 폴더·제보를 삭제할까요? 비로그인 저장은 유지됩니다.'))return;busy=true;try{await eraseAccount();clear();notice('계정 연결과 혜택 정보를 삭제했습니다.');}catch(e){notice(e.message);}finally{busy=false;}});
 const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
 script.onload=()=>{google.accounts.id.initialize({client_id:CLIENT,callback:signedIn,auto_select:false});google.accounts.id.renderButton($('benefits-google'),{theme:'outline',size:'large',text:'signin_with',locale:'ko'});};
 script.onerror=()=>notice('Google 로그인을 불러오지 못했습니다. 네트워크를 확인해 주세요.');document.head.append(script);
}


async function restore(){try{const me=await resume();if(!me)return;document.querySelectorAll('[data-promotion]').forEach(e=>e.hidden=me.adFree);
 $('benefits-logout').hidden=false;$('benefits-delete').hidden=false;$('benefits-admin').hidden=!me.admin;
 notice(`${me.email} · 로그인 유지 중`);if(me.admin)await members();
}catch(e){notice(e.message)}}
if($('benefits-google')){restore();setupCommunity($('benefits-account'));}

const accountButton=$('account-open'), accountDialog=$('account-dialog'), accountPanel=$('benefits-account');
if(accountButton && accountDialog && accountPanel){
 const anchor=document.createComment('account settings');
 accountPanel.before(anchor);
 const update=()=>{accountButton.textContent=account()?'내 계정':'로그인';};
 accountButton.addEventListener('click',()=>{
  accountPanel.open=true;accountDialog.append(accountPanel);accountDialog.showModal();
 });
 accountDialog.addEventListener('close',()=>{anchor.after(accountPanel);accountPanel.open=false;accountButton.focus();});
 window.addEventListener('tong-account-changed',update);update();
}
