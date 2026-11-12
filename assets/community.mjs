import {account,isAdmin,accountCall} from './account-store.mjs';
const API='https://tongdorak-benefits.bong40101.workers.dev';
function element(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
function button(text,action){const b=element('button',text);b.type='button';b.onclick=action;return b;}
export function setupCommunity(host){
 const root=element('section');root.className='tong-community';host.append(root);
 const dialog=element('dialog');dialog.className='tong-community-dialog';document.body.append(dialog);
 let mode='',timer,request=0;
 const close=()=>{clearInterval(timer);request++;dialog.close();};
 dialog.addEventListener('close',()=>{clearInterval(timer);request++});
 dialog.addEventListener('cancel',close);
 async function list(page=1){
  const generation=++request;
  const heading=element('h2',mode==='notices'?'공지사항':'오류·요청');
  dialog.replaceChildren(button('닫기',close),heading);
  const status=element('p','불러오는 중…');dialog.append(status);
  if(mode==='reports'&&!account()){status.textContent='Google 로그인 후 접수와 답변을 확인할 수 있어요.';return;}
  try{
   const data=mode==='notices'?await (await fetch(API+'/notices')).json():await accountCall('/reports?page='+page);
   if(generation!==request)return;status.remove();
   if(mode==='reports'||isAdmin())dialog.append(button(mode==='notices'?'공지 작성':'새 제보·요청',()=>edit()));
   const rows=data[mode];if(!rows.length)dialog.append(element('p','등록된 내용이 없어요.'));
   for(const row of rows)dialog.append(button(row.title+(row.status?' · '+row.status:''),()=>detail(row)));
   if(data.nextPage)dialog.append(button('이전 접수 더 보기',()=>list(data.nextPage)));
   if(page>1)dialog.append(button('처음으로',()=>list()));
  }catch(e){status.textContent=e.message;}
 }
 function detail(row){
  clearInterval(timer);request++;
  dialog.replaceChildren(button('← 목록',()=>{list();poll()}),element('h2',row.title));
  if(mode==='reports')dialog.append(element('p',row.email+' · '+row.status));
  dialog.append(element('p',row.content));if(row.reply)dialog.append(element('p','운영자 답변\n'+row.reply));
  if(isAdmin())dialog.append(button(mode==='notices'?'공지 수정':'답변·상태 변경',()=>edit(row)));
 }
 function edit(row){
  clearInterval(timer);request++;
  const reply=mode==='reports'&&row;
  const form=element('form');const title=element('input'),content=element('textarea');
  title.value=row?.title||'';title.maxLength=100;title.required=true;title.placeholder='제목';title.setAttribute('aria-label','제목');
  content.value=reply?row.reply||'':row?.content||'';content.maxLength=5000;content.required=true;content.rows=8;content.setAttribute('aria-label',reply?'운영자 답변':'내용');
  const state=element('select');state.setAttribute('aria-label','처리 상태');for(const value of ['접수','확인 중','완료'])state.append(new Option(value,value));state.value=row?.status||'접수';
  dialog.replaceChildren(button('← 목록',()=>{list();poll()}),element('h2',reply?'운영자 답변':mode==='notices'?'공지 작성·수정':'오류·요청 접수'),form);
  if(!reply)form.append(title);form.append(content);if(reply)form.append(state);
  if(mode==='reports'&&!row)form.append(element('p','이메일과 내용을 운영자에게 전달합니다. 비밀번호 등 민감한 정보는 적지 마세요.'));
  const submit=element('button','저장');submit.type='submit';form.append(submit);const status=element('p');form.append(status);
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{
   await accountCall('/'+mode,'POST',reply?{id:row.id,reply:content.value,status:state.value}:{...(row?{id:row.id}:{}),title:title.value,content:content.value});await list();poll();
  }catch(e){status.textContent=e.message}finally{submit.disabled=false}};
 }
 function poll(){clearInterval(timer);timer=setInterval(()=>{if(dialog.open&&!document.hidden)list()},30000)}
 for(const [key,label] of [['notices','공지사항'],['reports','오류 제보·요청 내역']])root.append(button(label,()=>{mode=key;dialog.showModal();list();poll()}));
}
