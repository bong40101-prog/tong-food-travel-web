import {compareRatings} from './rating-order.mjs';
import {placeField} from './language.mjs?v=20261124-complete';
import {account,accountCall,isAdmin} from './account-store.mjs';
const API='https://tongdorak-benefits.bong40101.workers.dev';
const nodes=new Map();let scheduled=false,opened=null;
const cardRatings=new WeakMap(),cardOrder=new WeakMap();let nextOrder=0;
function reorderRatedCards(){const list=document.getElementById('cards');if(!list)return;const original=[...list.children];const sorted=original.slice().sort((a,b)=>compareRatings(cardRatings.get(a),cardRatings.get(b))||(cardOrder.get(a)??0)-(cardOrder.get(b)??0));if(sorted.some((c,i)=>c!==original[i])){const focus=document.activeElement;list.append(...sorted);if(focus&&list.contains(focus))focus.focus({preventScroll:true});}}

const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
const authored=text=>{const e=el("p",text);e.dataset.i18nPreserve="";return e};
export const ratingLabel=r=>r?.count?`⭐ ${Number(r.average).toFixed(1)} · 평가 ${r.count}개`:'아직 평가 없음';
function button(text,fn){const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b}
async function publicCall(path,body){const r=await fetch(API+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('평점을 불러오지 못했어요. 다시 시도해 주세요.');return r.json()}
async function summaries(){scheduled=false;for(const [k,n]of nodes)if(!n.isConnected)nodes.delete(k);const keys=[...nodes.keys()];for(let i=0;i<keys.length;i+=100){const group=keys.slice(i,i+100);try{const d=await publicCall('/rating-summaries',{places:group});for(const k of group){const n=nodes.get(k);if(n){n.textContent=ratingLabel(d.ratings[k])+(d.ratings[k]?.count?` · 현장 ${d.ratings[k].onsiteCount||0}개`:'');cardRatings.set(n.closest('.card'),d.ratings[k]||null)}}}catch{for(const k of group){const n=nodes.get(k);if(n)n.textContent='평점 확인 · 다시 시도'}}}reorderRatedCards()}
export function attachRating(card,place){cardOrder.set(card,nextOrder++);const key=`${place.country.id}/${place.id}`;const b=button('평점 불러오는 중…',()=>openRating(key,placeField(place,'name')));b.className='rating-summary';b.setAttribute('aria-label',`${place.name} 평균 별점 및 평가 인원 확인`);card.querySelector('h3').after(b);nodes.set(key,b);if(!scheduled){scheduled=true;setTimeout(summaries,0)}}
function modal(title){const d=el('dialog',null,'rating-dialog');const head=el('header');head.append(el('h2',title),button('닫기',()=>d.close()));const body=el('div');d.append(head,body);document.body.append(d);d.addEventListener('close',()=>{if(opened?.dialog===d)opened=null;d.remove()});d.showModal();return {dialog:d,body}}
async function openRating(key,name){if(opened)opened.dialog.close();const view=modal(name+' · 별점');opened={...view,key};await renderRating()}
async function renderRating(){const view=opened;if(!view)return;view.body.replaceChildren(el('p','평점을 불러오는 중…'));try{const data=await publicCall('/reviews?place='+encodeURIComponent(view.key));if(opened!==view)return;
view.body.replaceChildren(el('h3','통도락 이용자 별점'),el('p',ratingLabel(data),'rating-average'),el('p',`그중 현장 평가 ${data.onsiteCount||0}개`),el('p','별점 등록·수정·삭제는 통도락여행 앱에서 Google 로그인 후 가능합니다.'),el('p','현장 평가는 평가할 때 가게 근처에 있었음을 뜻하며 실제 식사를 확인한 것은 아닙니다. GPS 오차·위치 조작 가능성이 있습니다.'));
const filters=el('div',null,'rating-actions'),list=el('div');let selected='all';
function show(){list.replaceChildren();for(const r of (data.reviews||[]).filter(r=>r.reviewer_role==='operator')){const section=el('section');section.append(el('h3','운영자 평가'),el('p',`★ ${r.rating} · 이용자 평균 제외`));if(r.comment)section.append(authored(r.comment));list.append(section)}for(const r of data.reviews||[]){if(r.reviewer_role==='operator')continue;if(selected!=='all'&&r.review_method!==selected)continue;list.append(el('p',`★ ${r.rating} · ${r.reviewer_role==='operator'?'운영자 평가 (이용자 평균 제외)':r.review_method==='onsite'?'현장 평가':'일반 평가'}`));if(r.comment)list.append(authored(r.comment))}if(!list.childNodes.length)list.append(el('p','표시할 평가가 없어요.'));for(const b of filters.children)b.setAttribute('aria-pressed',String(b.dataset.type===selected))}
for(const [id,label] of [['all','전체'],['onsite','현장 평가'],['general','일반 평가']]){const b=button(label,()=>{selected=id;show()});b.dataset.type=id;filters.append(b)}
view.body.append(filters,list,el('p','최근 평가 최대 50개 표시 · 평균과 인원은 공개 이용자 평가 기준 (운영자 제외)'));show();appendGoogleRating(view.body,view.key,view);
}catch(e){if(opened===view)view.body.replaceChildren(el('p',e.message),button('다시 시도',renderRating))}}
window.addEventListener('tong-account-changed',()=>{if(opened)renderRating();setupAdmin()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){summaries();if(opened)renderRating()}});
setInterval(()=>{if(!document.hidden)summaries()},60000);
function setupAdmin(){const panel=document.getElementById('benefits-admin');if(!panel||document.getElementById('ratings-admin-open'))return;const b=button('★ 운영자 별점 관리',()=>openAdmin());b.id='ratings-admin-open';panel.prepend(b)}
setupAdmin();
async function openAdmin(){if(!isAdmin())return;const {dialog,body}=modal('운영자 별점 관리');let page=1,busy=false;
 const owner=account();const guard=()=>{if(!isAdmin()||account()!==owner)dialog.close()};window.addEventListener('tong-account-changed',guard);dialog.addEventListener('close',()=>window.removeEventListener('tong-account-changed',guard),{once:true});
 async function load(){body.replaceChildren(el('p','불러오는 중…'));try{const d=await accountCall('/admin/reviews?page='+page);if(!dialog.isConnected||!isAdmin()||account()!==owner)return;body.replaceChildren(el('p','관리자는 다른 이용자의 별점 값을 변경할 수 없습니다. 숨김·복원에는 사유가 기록됩니다.'),el('p',d.criterion));
 body.append(el('h3','평가 집중 알림'));if(!d.alerts.length)body.append(el('p','감지된 평가 집중이 없습니다.'));for(const a of d.alerts){body.append(el('p',`${a.place_key} · ${a.accounts}개 계정 · ${new Date(a.detected_at).toLocaleString('ko-KR')} · 검토 필요`))}
 body.append(el('h3','통도락 평가 확인'),el('p',`현재 ${page}페이지 · ${d.reviews.length}개 · 상태 필터는 현재 페이지에 적용됩니다.`));
 const filters=el('div',null,'rating-actions');body.append(filters);let filter='전체';const rows=[];const empty=el('p','해당 상태의 별점이 없어요.');
 function filterRows(){let count=0;for(const [row,hidden] of rows){row.hidden=filter!=='전체'&&(filter==='숨김')!==Boolean(hidden);if(!row.hidden)count++}empty.hidden=count>0;for(const b of filters.children)b.setAttribute('aria-pressed',String(b.textContent===filter))}
 for(const label of ['전체','공개','숨김'])filters.append(button(label,()=>{filter=label;filterRows()}));
 for(const r of d.reviews){const row=el('section',null,'rating-admin-row');row.append(el('strong',`${r.place_key} · ${r.rating}점 · ${r.hidden?'숨김':'공개'}`));if(r.comment)row.append(authored(r.comment));const reason=el('textarea');reason.maxLength=300;reason.placeholder='확인한 기준과 처리 사유 (필수)';reason.setAttribute('aria-label','처리 사유');const status=el('p');const action=button(r.hidden?'복원':'집계에서 숨기기',async()=>{if(busy||!reason.value.trim()||!isAdmin()||account()!==owner)return;if(!window.confirm(`${r.place_key} · ${r.rating}점\n${r.hidden?'복원':'집계에서 숨기기'} 처리할까요?\n사유: ${reason.value.trim()}\n점수는 변경되지 않습니다.`))return;busy=true;action.disabled=true;try{await accountCall('/admin/reviews','POST',{id:r.id,hidden:!r.hidden,reason:reason.value.trim()});await summaries();await load()}catch(e){status.textContent=e.message;action.disabled=false}finally{busy=false}});action.disabled=true;reason.addEventListener('input',()=>{action.disabled=busy||!reason.value.trim()});row.append(reason,action,status);rows.push([row,r.hidden]);body.append(row)}
 body.append(empty);filterRows();
 const nav=el('div',null,'rating-actions');if(page>1)nav.append(button('이전',()=>{page--;load()}));if(d.nextPage)nav.append(button('다음',()=>{page=d.nextPage;load()}));body.append(nav);
 body.append(el('h3','처리 내역 (최근 100건)'));for(const h of d.history)body.append(el('p',`${new Date(h.created_at).toLocaleString('ko-KR')} · ${h.place_key} · ${h.action==='hide'?'숨김':'복원'} · ${h.reason} · ${h.evidence}`));
 }catch(e){body.replaceChildren(el('p',e.message),button('다시 시도',load))}}await load()}
function appendGoogleRating(body,key,view){
 const section=el('section',null,'google-rating-section'),status=el('p','통도락 이용자 평가와 별도로 표시합니다.'),links=el('div');status.setAttribute('aria-live','polite');
 const action=button('다시 시도',async()=>{
  action.disabled=true;action.hidden=true;status.textContent='불러오는 중…';links.replaceChildren();
  try{
   const r=await (view.googleRatingPromise ||= publicCall('/google-rating?place='+encodeURIComponent(key)));if(!section.isConnected)return;
   if(r.status==='unavailable')view.googleRatingPromise=null;
   status.textContent=r.status==='ok'?`★ ${Number(r.rating).toFixed(1)} · 평가 ${Number(r.count).toLocaleString('ko-KR')}개`:({empty:'Google Maps에 등록된 별점이 없어요.',unlinked:'정확한 Google 장소 연결을 확인 중이에요.',monthly_limit:'이번 달 무료 이용 보호 한도에 도달했어요.',hour_limit:'잠시 후 다시 확인해 주세요.',not_ready:'Google 별점 연결 준비 중이에요.'}[r.status]||'불러오지 못했어요. 다시 시도해 주세요.');
   function link(label,url){if(!/^https:\/\//.test(url||''))return;const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a)}
   if(r.url?.startsWith('https://www.google.com/maps/'))link('Google Maps에서 보기',r.url);
   for(const a of r.attributions||[])if(a.url)link(a.name,a.url);else links.append(el('span',a.name));
   link('Google Maps 평가 정책','https://support.google.com/contributionpolicy/answer/7400114');
   action.hidden=['ok','empty','monthly_limit','hour_limit','not_ready','unlinked'].includes(r.status);action.disabled=action.hidden;
  }catch{view.googleRatingPromise=null;status.textContent='불러오지 못했어요. 다시 시도해 주세요.';action.disabled=false;action.hidden=false}
 });section.append(el('h3','Google Maps 별점'),status,action,links);body.append(section);action.click();
}
