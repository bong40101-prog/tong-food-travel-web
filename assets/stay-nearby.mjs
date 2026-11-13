import {requestFoodApi} from './food-api.mjs?v=20261112-admin-auth2';
// Short-lived in-memory reuse only; no persistent Google result storage.
const hotelResults=new Map();
const API='https://tongdorak-benefits.bong40101.workers.dev';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
function button(text,fn){const n=el('button',text);n.type='button';n.addEventListener('click',fn);return n}
export function mountStayNearby(renderCard,country){
 let cleanup=()=>{};
 document.getElementById('search').addEventListener('input',()=>cleanup(),{capture:true});
 document.querySelector('.scope').addEventListener('change',()=>cleanup(),{capture:true});
 return open;
 function open(query=''){
  cleanup();
  const opener=document.getElementById('search');
  const dialog=el('section');dialog.className='stay-dialog stay-inline';const controller=new AbortController();
  const header=el('header'),title=el('h2','숙소·장소 주변 맛집');header.append(title);
  const form=el('form'),label=el('label','숙소·장소 이름 또는 주소'),input=el('input');input.value=query;input.maxLength=160;input.placeholder='예: 호텔 센츄리 아트';label.append(input);
  const submit=el('button','검색');submit.type='submit';form.append(label,submit);form.hidden=true;
  const attribution=el('p');for(const [name,url]of [['Google Maps','https://maps.google.com/']]){const a=el('a',name);a.href=url;a.target='_blank';a.rel='noopener';attribution.append(a,document.createTextNode(' '))}
  const status=el('p'),candidates=el('div'),results=el('div');status.setAttribute('role','status');
  dialog.append(header,form,status,candidates,results,el('p','휴대폰 현재 위치는 사용하지 않습니다. 검색어와 선택한 국가가 Google에 전송됩니다.'),attribution);const host=document.getElementById('places');
  const siblings=[...host.children].filter(n=>n.matches('.filter-row,.browse-hint,.cards,.pagination,.empty'));
  const previous=siblings.map(n=>n.hidden);siblings.forEach(n=>n.hidden=true);
  host.classList.add('stay-active');host.append(dialog);
  cleanup=()=>{controller.abort();dialog.remove();host.classList.remove('stay-active');siblings.forEach((n,i)=>n.hidden=previous[i]);cleanup=()=>{}};
  let busy=false,selected=null,radius=3,missing=false,page=1;
  const mapCache=new Map();const release=cleanup;cleanup=()=>{for(const url of mapCache.values())URL.revokeObjectURL(url);mapCache.clear();release()};
  dialog.scrollIntoView({block:'start',behavior:'smooth'});
  async function run(fn){if(busy)return;busy=true;status.textContent='불러오는 중…';submit.disabled=true;try{await fn()}catch(e){if(dialog.isConnected)status.textContent=e.message||'연결을 확인하고 다시 시도해 주세요.'}finally{busy=false;submit.disabled=false}}
  async function checked(response){if(response.status===429){const err=await response.json().catch(()=>({}));throw Error(err.error==='monthly_limit'?'이번 달 장소 검색 4,500회를 모두 사용했어요. 다음 달에 다시 이용해 주세요.':`검색 한도에 도달했어요. ${response.headers.get('Retry-After')||60}초 후 다시 시도해 주세요.`);}if(!response.ok)throw Error('검색하지 못했어요. 잠시 후 다시 시도해 주세요.');return response.json()}
  form.addEventListener('submit',event=>{event.preventDefault();if(input.value.trim().length<2){status.textContent='검색어를 두 글자 이상 입력해 주세요.';return}run(async()=>{
    const searchBody={query:input.value.trim(),country:country()},searchKey=JSON.stringify(searchBody);
    const cached=hotelResults.get(searchKey);
    const data=cached&&Date.now()-cached.time<120000?cached.data:await checked(await fetch(API+'/place-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(searchBody),signal:controller.signal}));
    if(!cached||Date.now()-cached.time>=120000){if(hotelResults.size>=10)hotelResults.delete(hotelResults.keys().next().value);hotelResults.set(searchKey,{time:Date.now(),data});}
    if(!dialog.isConnected)return;candidates.replaceChildren();results.replaceChildren();selected=null;
    status.textContent=data.candidates.length?'이름과 주소를 확인하고 선택하세요.':'찾지 못했어요. 영문 이름 또는 주소로 검색해 주세요.';
    for(const candidate of data.candidates){const b=button('',()=>run(()=>near(candidate,3,false,1)));b.className='stay-candidate';b.append(el('strong',candidate.name),el('span',candidate.address));candidates.append(b);for(const a of candidate.attributions||[]){if(a.provider){const credit=el('span',a.provider);candidates.append(credit)}}}
  })});
  if(query.trim().length>=2)form.requestSubmit();
  async function near(candidate,r,unknown,p){
    const data=await checked(await requestFoodApi('tongfood-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country:candidate.country||'',query:'',region:'',city:'',category:'',favorites:null,page:p,fullList:true,nearby:{coordinates:candidate.coordinates,radius:r,missing:unknown}}),signal:controller.signal}));
    if(data.distanceType!=='straight_line')throw Error('주변 검색 연결 준비 중입니다. 잠시 후 다시 시도해 주세요.');if(!dialog.isConnected)return;
    selected=candidate;radius=r;missing=unknown;page=p;candidates.replaceChildren();results.replaceChildren();status.textContent='';
    const top=el('div'),info=el('div');top.className='stay-result-top';info.className='stay-result-info';info.append(el('h3',candidate.name),el('p',candidate.address));
    const filters=el('div');filters.className='stay-controls';filters.append(button('검색어 바꾸기',()=>{opener.focus();opener.select()}));for(const km of [1,3,5]){const b=button(km+'km',()=>run(()=>near(selected,km,false,1)));b.setAttribute('aria-pressed',String(radius===km));filters.append(b)}
    filters.append(button('가까운 순',()=>run(()=>near(selected,radius,false,1))),button(`좌표 없음 ${data.missingCount}곳`,()=>run(()=>near(selected,radius,true,1))));
    top.append(info,filters);results.append(top);
    const summary=el('p');summary.className='stay-distance-summary';summary.append(el('span','직선거리 기준 · 실제 도보·차량 이동거리와 다릅니다.'),el('span',missing?'선택한 국가 전체 · 좌표 미확인 음식점':`반경 ${radius}km · ${data.total}곳`));results.append(summary);
    if(!missing&&data.places.length) {
      const mapBox=el('figure');mapBox.className='stay-map';const mapStatus=el('p','지도를 불러오는 중…');mapBox.append(mapStatus);results.append(mapBox);
      const keys=data.places.map(place=>place.country.id+'/'+place.id);
      const cacheKey=JSON.stringify([candidate.coordinates,keys]);
      void (async()=>{try {
        let objectUrl=mapCache.get(cacheKey);
        if(!objectUrl){
          const response=await fetch(API+'/stay-map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coordinates:candidate.coordinates,keys}),signal:controller.signal});
          if(!response.ok)throw Error(response.status===429?'이번 달 지도·장소 검색 한도에 도달했어요.':'지도를 불러오지 못했어요. 아래 맛집 목록은 이용할 수 있어요.');
          objectUrl=URL.createObjectURL(await response.blob());mapCache.set(cacheKey,objectUrl);
        }
        if(!dialog.isConnected||!mapBox.isConnected)return;
        const image=el('img');image.src=objectUrl;image.alt=candidate.name+'(파란 H)와 주변 등록 맛집(초록 번호) 지도';image.width=1280;image.height=800;
        const mapLink=el('a');const u=new URL('https://www.google.com/maps/search/');u.searchParams.set('api','1');u.searchParams.set('query',candidate.name+' '+candidate.address);if(candidate.id)u.searchParams.set('query_place_id',candidate.id);mapLink.href=u.href;mapLink.target='_blank';mapLink.rel='noopener';mapLink.append(image);
        mapBox.replaceChildren(mapLink,el('figcaption','파란 H: 선택한 호텔 · 초록 번호: 아래 맛집 순서 · 지도를 누르면 Google 지도에서 호텔을 엽니다.'));
      } catch(e) {if(mapBox.isConnected)mapStatus.textContent=e.message||'지도를 불러오지 못했어요.';}})();
    }
    if(!data.places.length)results.append(el('p','표시할 음식점이 없습니다. 좌표 없는 음식점 목록도 확인해 주세요.'));
    const cards=el('div');cards.className='stay-cards';for(const [i,place] of data.places.entries()){const wrap=el('section');if(!missing)wrap.append(el('strong',`${'123456789ABCDEFGHI'[i]} · 직선거리 ${place.distanceMeters.toLocaleString('ko-KR')}m`));wrap.append(renderCard(place));cards.append(wrap)}results.append(cards);
    const nav=el('div');if(page>1)nav.append(button('이전',()=>run(()=>near(selected,radius,missing,page-1))));if(data.nextPage)nav.append(button('다음',()=>run(()=>near(selected,radius,missing,data.nextPage))));results.append(nav);
  }
 }
}