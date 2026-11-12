import {account,accountCall,isAdmin} from './account-store.mjs';
const API='https://tongdorak-benefits.bong40101.workers.dev';
const nodes=new Map();let scheduled=false,opened=null;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
export const ratingLabel=r=>r?.count?`⭐ ${Number(r.average).toFixed(1)} · ${r.count}명`:'아직 평가 없음';
function button(text,fn){const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b}
async function publicCall(path,body){const r=await fetch(API+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('평점을 불러오지 못했어요. 다시 시도해 주세요.');return r.json()}
async function summaries(){scheduled=false;for(const [k,n]of nodes)if(!n.isConnected)nodes.delete(k);const keys=[...nodes.keys()];for(let i=0;i<keys.length;i+=100){const group=keys.slice(i,i+100);try{const d=await publicCall('/rating-summaries',{places:group});for(const k of group){const n=nodes.get(k);if(n)n.textContent=ratingLabel(d.ratings[k])}}catch{for(const k of group){const n=nodes.get(k);if(n)n.textContent='평점 확인 · 다시 시도'}}}}
export function attachRating(card,place){const key=`${place.country.id}/${place.id}`;const b=button('평점 불러오는 중…',()=>openRating(key,place.name));b.className='rating-summary';b.setAttribute('aria-label',`${place.name} 별점 확인 및 평가`);card.querySelector('h3').after(b);nodes.set(key,b);if(!scheduled){scheduled=true;setTimeout(summaries,0)}}
function modal(title){const d=el('dialog',null,'rating-dialog');const head=el('header');head.append(el('h2',title),button('닫기',()=>d.close()));const body=el('div');d.append(head,body);document.body.append(d);d.addEventListener('close',()=>{if(opened?.dialog===d)opened=null;d.remove()});d.showModal();return {dialog:d,body}}
async function openRating(key,name){if(opened)opened.dialog.close();const view=modal(name+' · 별점');opened={...view,key};await renderRating()}
async function renderRating(){const view=opened;if(!view)return;const owner=account();view.body.replaceChildren(el('p','평점을 불러오는 중…'));
 try{const path='/reviews?place='+encodeURIComponent(view.key);const data=owner?await accountCall(path):await publicCall(path);if(opened!==view||owner!==account())return;
 const box=view.body;box.replaceChildren(el('p',ratingLabel(data),'rating-average'),el('p','한 계정당 장소별 별점 1개 · 글과 사진은 아직 받지 않습니다.'));
 if(!owner){box.append(button('Google 로그인 후 평가',()=>{view.dialog.close();document.getElementById('account-open')?.click()}));return}
 let value=data.mine?.rating||5,busy=false;
 const field=el('fieldset'),legend=el('legend','내 별점');field.append(legend);const choices=el('div',null,'rating-stars');
 for(let n=1;n<=5;n++){const label=el('label'),input=el('input');input.type='radio';input.name='rating';input.value=n;input.checked=n===value;input.addEventListener('change',()=>value=n);label.append(input,document.createTextNode(`${n}점`));choices.append(label)}field.append(choices);box.append(field);
 if(data.mine?.hidden)box.append(el('p','운영자 확인으로 집계에서 제외된 평가입니다. 오류 제보로 이의를 신청할 수 있습니다.'));
 const consent=el('input');consent.type='checkbox';const label=el('label',null,'rating-consent');label.append(consent,document.createTextNode('별점 공개 및 평가 운영규칙에 동의합니다.'));
 const rules=el('a','평가 운영규칙');rules.href='./review-rules.html';rules.target='_blank';rules.rel='noopener';box.append(label,rules);
 const status=el('p');status.setAttribute('role','status');
 const save=button(data.mine?'내 별점 수정':'별점 등록',()=>act('POST'));save.disabled=true;consent.addEventListener('change',()=>save.disabled=!consent.checked||busy);
 const remove=button('내 별점 삭제',()=>act('DELETE'));const actions=el('div',null,'rating-actions');actions.append(save);if(data.mine)actions.append(remove);box.append(actions,status);
 async function act(method){if(busy||owner!==account())return;busy=true;save.disabled=true;remove.disabled=true;status.textContent='처리 중…';try{await accountCall('/reviews',method,{place:view.key,...(method==='POST'?{rating:value,consent:'2026-11-13'}:{})});await summaries();if(opened===view)await renderRating()}catch(e){status.textContent=e.message;busy=false;save.disabled=!consent.checked;remove.disabled=false}}
 }catch(e){if(opened===view){view.body.replaceChildren(el('p',e.message),button('다시 시도',renderRating))}}}
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