import {account,accountCall,isAdmin} from './account-store.mjs';
const API='https://tongdorak-benefits.bong40101.workers.dev';
const nodes=new Map();let scheduled=false,opened=null;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
export const ratingLabel=r=>r?.count?`⭐ ${Number(r.average).toFixed(1)} · 평가 ${r.count}개`:'아직 평가 없음';
function button(text,fn){const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b}
async function publicCall(path,body){const r=await fetch(API+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('평점을 불러오지 못했어요. 다시 시도해 주세요.');return r.json()}
async function summaries(){scheduled=false;for(const [k,n]of nodes)if(!n.isConnected)nodes.delete(k);const keys=[...nodes.keys()];for(let i=0;i<keys.length;i+=100){const group=keys.slice(i,i+100);try{const d=await publicCall('/rating-summaries',{places:group});for(const k of group){const n=nodes.get(k);if(n)n.textContent=ratingLabel(d.ratings[k])+(d.ratings[k]?.count?` · 현장 ${d.ratings[k].onsiteCount||0}개`:'')}}catch{for(const k of group){const n=nodes.get(k);if(n)n.textContent='평점 확인 · 다시 시도'}}}}
export function attachRating(card,place){const key=`${place.country.id}/${place.id}`;const b=button('평점 불러오는 중…',()=>openRating(key,place.name));b.className='rating-summary';b.setAttribute('aria-label',`${place.name} 평균 별점 및 평가 인원 확인`);card.querySelector('h3').after(b);nodes.set(key,b);if(!scheduled){scheduled=true;setTimeout(summaries,0)}}
function modal(title){const d=el('dialog',null,'rating-dialog');const head=el('header');head.append(el('h2',title),button('닫기',()=>d.close()));const body=el('div');d.append(head,body);document.body.append(d);d.addEventListener('close',()=>{if(opened?.dialog===d)opened=null;d.remove()});d.showModal();return {dialog:d,body}}
async function openRating(key,name){if(opened)opened.dialog.close();const view=modal(name+' · 별점');opened={...view,key};await renderRating()}
async function renderRating(){const view=opened;if(!view)return;view.body.replaceChildren(el('p','평점을 불러오는 중…'));try{const data=await publicCall('/reviews?place='+encodeURIComponent(view.key));if(opened!==view)return;
view.body.replaceChildren(el('p',ratingLabel(data),'rating-average'),el('p',`그중 현장 평가 ${data.onsiteCount||0}개`),el('p','별점 등록·수정·삭제는 통도락여행 앱에서 Google 로그인 후 가능합니다.'),el('p','현장 평가는 평가할 때 가게 근처에 있었음을 뜻하며 실제 식사를 확인한 것은 아닙니다. GPS 오차·위치 조작 가능성이 있습니다.'));
const filters=el('div',null,'rating-actions'),list=el('div');let selected='all';
function show(){list.replaceChildren();for(const r of data.reviews||[]){if(selected!=='all'&&r.review_method!==selected)continue;list.append(el('p',`★ ${r.rating} · ${r.review_method==='onsite'?'현장 평가':'일반 평가'}`))}if(!list.childNodes.length)list.append(el('p','표시할 평가가 없어요.'));for(const b of filters.children)b.setAttribute('aria-pressed',String(b.dataset.type===selected))}
for(const [id,label] of [['all','전체'],['onsite','현장 평가'],['general','일반 평가']]){const b=button(label,()=>{selected=id;show()});b.dataset.type=id;filters.append(b)}
view.body.append(filters,list,el('p','최근 평가 최대 50개 표시 · 평균과 인원은 전체 공개 평가 기준'));show();
}catch(e){if(opened===view)view.body.replaceChildren(el('p',e.message),button('다시 시도',renderRating))}}
window.addEventListener('tong-account-changed',()=>{if(opened)renderRating();setupAdmin()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){summaries();if(opened)renderRating()}});
setInterval(()=>{if(!document.hidden)summaries()},60000);
function setupAdmin(){const panel=document.getElementById('benefits-admin');if(!panel||document.getElementById('ratings-admin-open'))return;const b=button('별점 집중·처리 내역',()=>openAdmin());b.id='ratings-admin-open';panel.append(b)}
setupAdmin();
async function openAdmin(){if(!isAdmin())return;const {dialog,body}=modal('별점 관리');let page=1,busy=false;
 async function load(){body.replaceChildren(el('p','불러오는 중…'));try{const d=await accountCall('/admin/reviews?page='+page);if(!dialog.isConnected)return;body.replaceChildren(el('p','관리자는 별점 값을 변경할 수 없습니다. 숨김·복원에는 사유가 기록됩니다.'),el('p',d.criterion));
 body.append(el('h3','평가 집중 알림'));if(!d.alerts.length)body.append(el('p','감지된 평가 집중이 없습니다.'));for(const a of d.alerts){body.append(el('p',`${a.place_key} · ${a.accounts}개 계정 · ${new Date(a.detected_at).toLocaleString('ko-KR')} · 검토 필요`))}
 body.append(el('h3','평가 확인'));for(const r of d.reviews){const row=el('section',null,'rating-admin-row');row.append(el('strong',`${r.place_key} · ${r.rating}점 · ${r.hidden?'숨김':'공개'}`));const reason=el('textarea');reason.maxLength=300;reason.placeholder='확인한 기준과 처리 사유 (필수)';reason.setAttribute('aria-label','처리 사유');const status=el('p');const action=button(r.hidden?'복원':'집계에서 숨기기',async()=>{if(busy||!reason.value.trim())return;busy=true;action.disabled=true;try{await accountCall('/admin/reviews','POST',{id:r.id,hidden:!r.hidden,reason:reason.value.trim()});await summaries();await load()}catch(e){status.textContent=e.message;action.disabled=false}finally{busy=false}});row.append(reason,action,status);body.append(row)}
 const nav=el('div',null,'rating-actions');if(page>1)nav.append(button('이전',()=>{page--;load()}));if(d.nextPage)nav.append(button('다음',()=>{page=d.nextPage;load()}));body.append(nav);
 body.append(el('h3','처리 내역 (최근 100건)'));for(const h of d.history)body.append(el('p',`${new Date(h.created_at).toLocaleString('ko-KR')} · ${h.place_key} · ${h.action==='hide'?'숨김':'복원'} · ${h.reason} · ${h.evidence}`));
 }catch(e){body.replaceChildren(el('p',e.message),button('다시 시도',load))}}await load()}