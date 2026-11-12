import {requestFoodApi} from './food-api.mjs?v=20261112-admin-auth2';
const API='https://tongdorak-benefits.bong40101.workers.dev';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
function button(text,fn){const n=el('button',text);n.type='button';n.addEventListener('click',fn);return n}
export function mountStayNearby(renderCard,country){
 const opener=button('숙소·장소 주변 맛집 찾기',open);opener.className='stay-open';document.getElementById('search-form').after(opener);
 function open(){
  const dialog=el('dialog');dialog.className='stay-dialog';const controller=new AbortController();
  const header=el('header'),title=el('h2','숙소·장소 주변 맛집');header.append(title,button('닫기',()=>dialog.close()));
  const form=el('form'),label=el('label','숙소·장소 이름 또는 주소'),input=el('input');input.maxLength=160;input.placeholder='예: 호텔 센츄리 아트';label.append(input);
  const submit=el('button','검색');submit.type='submit';form.append(label,submit);
  const attribution=el('p');for(const [name,url]of [['Powered by Geoapify','https://www.geoapify.com/'],['© OpenStreetMap contributors','https://www.openstreetmap.org/copyright']]){const a=el('a',name);a.href=url;a.target='_blank';a.rel='noopener';attribution.append(a,document.createTextNode(' '))}
  const status=el('p'),candidates=el('div'),results=el('div');status.setAttribute('role','status');
  dialog.append(header,el('p','이름·주소를 검색하고 후보를 선택하세요. 휴대폰 현재 위치는 사용하지 않습니다.'),form,el('p','입력한 검색어와 선택한 국가가 Geoapify에 전송됩니다.'),attribution,status,candidates,results);document.body.append(dialog);
  let busy=false,selected=null,radius=3,missing=false,page=1;
  dialog.addEventListener('close',()=>{controller.abort();dialog.remove();opener.focus()});dialog.showModal();input.focus();
  async function run(fn){if(busy)return;busy=true;status.textContent='불러오는 중…';submit.disabled=true;try{await fn()}catch(e){if(dialog.open)status.textContent=e.message||'연결을 확인하고 다시 시도해 주세요.'}finally{busy=false;submit.disabled=false}}
  async function checked(response){if(response.status===429)throw Error(`검색 한도에 도달했어요. ${response.headers.get('Retry-After')||60}초 후 다시 시도해 주세요.`);if(!response.ok)throw Error('검색하지 못했어요. 잠시 후 다시 시도해 주세요.');return response.json()}
  form.addEventListener('submit',event=>{event.preventDefault();if(input.value.trim().length<2){status.textContent='검색어를 두 글자 이상 입력해 주세요.';return}run(async()=>{
    const data=await checked(await fetch(API+'/place-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:input.value.trim(),country:country()}),signal:controller.signal}));
    if(!dialog.open)return;candidates.replaceChildren();results.replaceChildren();selected=null;
    status.textContent=data.candidates.length?'이름과 주소를 확인하고 선택하세요.':'찾지 못했어요. 영문 이름 또는 주소로 검색해 주세요.';
    for(const candidate of data.candidates){const b=button('',()=>run(()=>near(candidate,3,false,1)));b.className='stay-candidate';b.append(el('strong',candidate.name),el('span',candidate.address));candidates.append(b)}
  })});
  async function near(candidate,r,unknown,p){
    const data=await checked(await requestFoodApi('tongfood-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country:candidate.country||'',query:'',region:'',city:'',category:'',favorites:null,page:p,fullList:true,nearby:{coordinates:candidate.coordinates,radius:r,missing:unknown}}),signal:controller.signal}));
    if(data.distanceType!=='straight_line')throw Error('주변 검색 연결 준비 중입니다. 잠시 후 다시 시도해 주세요.');if(!dialog.open)return;
    selected=candidate;radius=r;missing=unknown;page=p;candidates.replaceChildren();results.replaceChildren();status.textContent='';
    results.append(el('h3',candidate.name),el('p',candidate.address),button('다른 후보 검색',()=>{results.replaceChildren();input.focus()}));
    const filters=el('div');filters.className='stay-controls';for(const km of [1,3,5]){const b=button(km+'km',()=>run(()=>near(selected,km,false,1)));b.setAttribute('aria-pressed',String(radius===km));filters.append(b)}
    filters.append(button('가까운 순',()=>run(()=>near(selected,radius,false,1))),button(`좌표 없음 ${data.missingCount}곳`,()=>run(()=>near(selected,radius,true,1))));
    results.append(filters,el('p','직선거리 기준 · 실제 도보·차량 이동거리와 다릅니다.'),el('p',missing?'선택한 장소의 국가 전체 · 좌표가 없어 거리를 확인할 수 없는 음식점':`반경 ${radius}km · ${data.total}곳`));
    if(!data.places.length)results.append(el('p','표시할 음식점이 없습니다. 좌표 없는 음식점 목록도 확인해 주세요.'));
    const cards=el('div');cards.className='stay-cards';for(const place of data.places){const wrap=el('section');if(!missing)wrap.append(el('strong',`직선거리 ${place.distanceMeters.toLocaleString('ko-KR')}m`));wrap.append(renderCard(place));cards.append(wrap)}results.append(cards);
    const nav=el('div');if(page>1)nav.append(button('이전',()=>run(()=>near(selected,radius,missing,page-1))));if(data.nextPage)nav.append(button('다음',()=>run(()=>near(selected,radius,missing,data.nextPage))));results.append(nav);
  }
 }
}