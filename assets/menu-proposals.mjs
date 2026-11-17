import {account,accountCall,isAdmin} from './account-store.mjs';
const API='https://tongdorak-benefits.bong40101.workers.dev';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
const button=(label,fn)=>{const b=el('button',label);b.type='button';b.onclick=fn;return b};
function modal(title){const d=el('dialog');d.className='rating-dialog';const body=el('div');d.append(el('h2',title),body,button('닫기',()=>d.close()));document.body.append(d);d.onclose=()=>d.remove();d.showModal();return {d,body}}
const queue=[];let scheduled=false;
export function attachMenuProposal(card,place,formatPrice,attachWon){
 if(place.category==='attraction')return;
 const base=place.additionalMenus||[];if(base.length>=2)return;
 const key=place.country.id+'/'+place.id;
 const b=button('메뉴·가격 제안',()=>proposal(place));b.className='menu-proposal-button';card.querySelector('.menu-line').parentElement.append(b);
 queue.push({card,place,key,b,formatPrice,attachWon});if(!scheduled){scheduled=true;queueMicrotask(loadApproved)}
}
async function loadApproved(){scheduled=false;const items=queue.splice(0);for(let i=0;i<items.length;i+=100){const batch=items.slice(i,i+100);try{
 const r=await fetch(API+'/approved-menus',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({places:batch.map(x=>x.key)}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const data=await r.json();
 for(const x of batch){if(!x.card.isConnected)continue;const seen=new Set([x.place.menu,...(x.place.additionalMenus||[]).map(m=>m.name)]);let count=seen.size;
 for(const m of data.menus[x.key]||[]){if(count>=3||seen.has(m.name))continue;seen.add(m.name);count++;
 const row=el('div');row.className='menu-line additional-menu';const name=el('strong',`${m.name} (${m.localName})`);name.className='menu-name';name.title=name.textContent;name.tabIndex=0;name.onclick=()=>{const v=modal('메뉴');v.body.append(el('p',name.textContent))};name.onkeydown=e=>{if(e.key==='Enter')name.click()};
 const prices=el('div');prices.className='price-block';const price=el('strong',x.formatPrice(m.price,x.place.country.currency));price.className='price';prices.append(price);x.attachWon(prices,{price:m.price,country:x.place.country});row.append(name,prices);[...x.card.querySelectorAll('.menu-line')].at(-1).after(row);
 }x.b.hidden=count>=3;
 }
 }catch{for(const x of batch){const retry=button('승인 메뉴 다시 확인',()=>{retry.remove();queue.push(x);loadApproved()});x.b.after(retry)}}}}
function proposal(place){const {d,body}=modal('메뉴·가격 제안');if(!account()){body.append(el('p','상단 로그인 버튼에서 Google 계정으로 로그인한 뒤 제안해 주세요.'));return}
 const owner=account(),fields={};body.append(el('p',place.name),el('p','운영자 승인 후에만 공개됩니다. 현지 가격과 확인 근거를 적어 주세요.'));
 for(const [key,label] of [['name','한국어 메뉴 이름'],['localName','현지어 메뉴 이름'],['amount',`현지 가격 (${place.country.currency})`],['evidence','메뉴판 링크/확인 날짜 · 세금 포함 여부']]){const l=el('label',label),input=el(key==='evidence'?'textarea':'input');input.maxLength=key==='evidence'?1000:key==='localName'?150:100;if(key==='amount'){input.type='number';input.min='0.01';input.step='0.01'}l.append(input);body.append(l);fields[key]=input}
 const status=el('p');status.setAttribute('aria-live','polite');const submit=button('승인 요청',async()=>{if(account()!==owner){d.close();return}const data=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()]));data.amount=Number(data.amount);if(!data.name||!data.localName||data.amount<=0||data.evidence.length<5){status.textContent='이름, 현지어 이름, 가격, 확인 근거를 모두 입력해 주세요.';return}submit.disabled=true;try{await accountCall('/menu-proposals','POST',{place:place.country.id+'/'+place.id,...data});body.replaceChildren(el('p','접수되었습니다. 운영자 승인 후 공개됩니다.'))}catch{status.textContent='제출하지 못했어요. 로그인, 메뉴 중복, 최대 3개와 하루 10회 제한을 확인해 주세요.';submit.disabled=false}});body.append(submit,status)
}
function setup(){const panel=document.getElementById('benefits-admin');if(!panel||document.getElementById('menu-proposals-admin'))return;const b=button('메뉴 제안 승인 관리',admin);b.id='menu-proposals-admin';panel.append(b)}
window.addEventListener('tong-account-changed',setup);setup();
async function admin(){if(!isAdmin())return;const owner=account(),{d,body}=modal('메뉴 제안 승인 관리');let page=1;const guard=()=>{if(!isAdmin()||account()!==owner)d.close()};window.addEventListener('tong-account-changed',guard);d.addEventListener('close',()=>window.removeEventListener('tong-account-changed',guard),{once:true});
 async function load(){body.replaceChildren(el('p','불러오는 중…'));try{const data=await accountCall('/admin/menu-proposals?page='+page);if(!d.isConnected)return;guard();body.replaceChildren();if(!data.proposals.length)body.append(el('p','접수된 제안이 없습니다.'));
 for(const p of data.proposals){const row=el('section');row.append(el('h3',p.place_name),el('p',`${p.name} (${p.local_name}) · ${p.amount} ${p.currency}`),el('p',p.evidence));
 if(p.status==='pending'){const reason=el('textarea');reason.placeholder='확인 근거/처리 사유 (필수)';reason.maxLength=500;reason.setAttribute('aria-label','처리 사유');const status=el('p');row.append(reason);for(const [action,label] of [['approve','승인'],['reject','반려']]){const b=button(label,async()=>{if(!reason.value.trim()){status.textContent='처리 사유를 입력해 주세요.';return}if(!confirm(`${p.place_name} · ${p.name} ${label}할까요?`))return;b.disabled=true;try{await accountCall('/admin/menu-proposals','POST',{id:p.id,action,reason:reason.value.trim()});await load()}catch{status.textContent='이미 처리되었거나 메뉴 수·중복 조건에 맞지 않습니다.';b.disabled=false}});row.append(b)}row.append(status)}else row.append(el('p',(p.status==='approved'?'승인':'반려')+' · '+p.reason));body.append(row)}
 if(page>1)body.append(button('이전',()=>{page--;load()}));if(data.nextPage)body.append(button('다음',()=>{page++;load()}));
 }catch{body.replaceChildren(el('p','불러오지 못했어요.'),button('다시 시도',load))}}await load();
}

