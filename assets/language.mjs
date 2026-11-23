import {conversion} from './exchange.mjs?v=20261112-price-order';
let data={ui:{},places:{}},patterns=[],loading;
async function loadTranslations(){
  if(!loading)loading=fetch(new URL('./ja-pilot.json?v=20261124-complete2',import.meta.url)).then(r=>{if(!r.ok)throw Error('translations');return r.json();}).then(value=>{data=value;patterns=(data.patterns||[]).map(p=>({...p,re:new RegExp(p.pattern)}));}).catch(error=>{loading=null;throw error;});
  return loading;
}
let language='ko';
try {language=localStorage.getItem('tongdorak:language')==='ja'?'ja':'ko';} catch {}
if(language==='ja')await loadTranslations().catch(()=>{language='ko';});
export const japanese=()=>language==='ja';
export function jaText(value) {
  if(data.ui[value])return data.ui[value];
  for(const p of patterns){const found=value.match(p.re);if(found)return p.text.replace(/\{(\d+)\}/g,(_,i)=>jaText(found[Number(i)]||''));}
  let m=value.match(/^(.+) 맛집과 여행지$/);if(m)return `${jaText(m[1])}のグルメ・観光スポット`;
  m=value.match(/^(.+) 검색 결과$/);if(m)return `${jaText(m[1])}の検索結果`;
  m=value.match(/^장소 ([\d,]+)곳$/);if(m)return `${m[1]}件`;
  m=value.match(/^([\d,]+)곳을 더 표시했어요\.$/);if(m)return `${m[1]}件を追加表示しました。`;
  if(value.includes(' / '))return value.split(' / ').map(jaText).join(' / ');
  if(value.includes(' · '))return value.split(' · ').map(jaText).join(' · ');
  return value;
}
export const t=value=>japanese()?jaText(value):value;
function entryFor(place){return data.places[`${place.country?.id}/${place.id}`]||data.places[place.id];}
export function placeField(place,key) {
  if(!japanese())return place[key]||'';
  const entry=entryFor(place);
  const translated=entry?.[key];
  if(translated!==undefined && (!entry._country || entry._country===place.country?.id) && (!entry._source || entry._source[key]===(place[key]||'')))return translated;
  const variant=entry?._variants?.[key]?.[place[key]||''];
  if(variant!==undefined && entry._country===place.country?.id)return variant;
  const local=key==='name'?place.localName:key==='menu'?place.menuLocalName:null;
  if(place.country?.id==='JP' && local && !/[가-힣]/.test(local))return local;
  return t(place[key]||'');
}
export function menuField(place,name,localName=''){
  if(!japanese())return name;
  const entry=entryFor(place);
  if(entry?._country===place.country?.id && entry.menus?.[name])return entry.menus[name];
  if(place.country?.id==='JP' && localName && !/[가-힣]/.test(localName))return localName;
  return t(name);
}
// Resolve translated display names locally; keep the original geographic filters and a single search request.
export function catalogQuery(query,country=''){
  if(!japanese() || !query.trim())return query;
  const normalized=query.trim().normalize('NFKC').toLocaleLowerCase();
  const entries=Object.values(data.places).filter(e=>!country||e._country===country);
  const norm=value=>String(value||'').trim().normalize('NFKC').toLocaleLowerCase();
  for(const field of ['name','city','menu']){
    const matches=new Set(entries.filter(e=>norm(e[field])===normalized).map(e=>e._source?.[field]).filter(Boolean));
    if(matches.size===1)return [...matches][0];
    if(matches.size>1)return query;
  }
  if(normalized.length>=3){const matches=entries.filter(e=>norm(e.name).startsWith(normalized));if(matches.length===1)return matches[0]._source.name;}
  return query;
}
export function yenPrice(amount,currency) {
  if(!Number.isFinite(amount))return '価格未確認';
  if(amount===0)return '無料';
  const nf=new Intl.NumberFormat('ja-JP');
  if(currency==='JPY')return '¥'+nf.format(amount);
  const original=currency==='KRW'?'₩'+nf.format(amount):new Intl.NumberFormat('ja-JP',{style:'currency',currency}).format(amount);
  const inverse=conversion(1,'JPY');
  const won=currency==='KRW'?amount:conversion(amount,currency)?.value;
  return original+(inverse && Number.isFinite(won)?'（約 ¥'+nf.format(Math.round(won/inverse.value))+'）':'（円換算なし）');
}
const originals=new WeakMap();
const attributeOriginals=new WeakMap();
function translateUI(root=document.body) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) {
    const node=walker.currentNode;
    if(node.parentElement?.closest('script,style,[data-i18n-preserve]'))continue;
    let saved=originals.get(node);
    if(!saved || (node.nodeValue!==saved.ko && node.nodeValue!==saved.ja)) {
      const trimmed=node.nodeValue.trim(), translated=jaText(trimmed);if(translated===trimmed)continue;
      saved={ko:node.nodeValue,ja:node.nodeValue.replace(trimmed,translated)};originals.set(node,saved);
    }
    const value=japanese()?saved.ja:saved.ko;if(node.nodeValue!==value)node.nodeValue=value;
  }
  for(const el of root.querySelectorAll('[title],[placeholder],[aria-label],[alt]')){
    if(el.closest('[data-i18n-preserve]') || el.id==='search')continue;
    let saved=attributeOriginals.get(el);if(!saved){saved={};attributeOriginals.set(el,saved);}
    for(const attr of ['title','placeholder','aria-label','alt']){
      if(!el.hasAttribute(attr))continue;const current=el.getAttribute(attr);
      if(!saved[attr] || current!==saved[attr].ko && current!==saved[attr].ja)saved[attr]={ko:current,ja:jaText(current)};
      const next=japanese()?saved[attr].ja:saved[attr].ko;if(current!==next)el.setAttribute(attr,next);
    }
  }
}
const bound=new Set();
export function localizeCard(card,place) {
  card.dataset.localeContent='';
  const accessibility=[['.food-photo','alt'],['.favorite-button','aria-label'],['.rating-summary','aria-label']].map(([selector,attr])=>{const el=card.querySelector(selector);return el?{el,attr,value:el.getAttribute(attr)}:null;}).filter(Boolean);
  const snapshots=[...card.querySelectorAll('h3,.local-name,.location span,.category,.menu-name,.menu-label,.price,.note,.place-source')].map(el=>({el,text:el.textContent,hidden:el.hidden,title:el.getAttribute('title'),aria:el.getAttribute('aria-label')}));
  const update=()=>{
    snapshots.forEach(({el,text,hidden,title,aria})=>{el.textContent=text;el.hidden=hidden;for(const [key,value] of [['title',title],['aria-label',aria]]){if(value===null)el.removeAttribute(key);else el.setAttribute(key,value);}});
    card.querySelectorAll('.localized-address').forEach(e=>e.remove());
    card.querySelectorAll('.yen-price').forEach(e=>e.remove());
    card.querySelectorAll('.won-price').forEach(e=>e.hidden=japanese());
    accessibility.forEach(({el,attr,value})=>{if(value===null)el.removeAttribute(attr);else el.setAttribute(attr,value);});
    if(!japanese())return;
    const set=(selector,text)=>{const el=card.querySelector(selector);if(el)el.textContent=text;};
    set('h3',placeField(place,'name'));
    const local=card.querySelector('.local-name');if(local)local.hidden=true;
    set('.location span',[...new Set([t(place.country.name),placeField(place,'city'),placeField(place,'area')].filter(Boolean))].join(' · '));
    set('.category',t(place.storeType?.name||place.categoryName||'해산물'));
    set('.menu-label',place.category==='attraction'?'見学情報':'おすすめメニュー');set('.menu-name',placeField(place,'menu'));
    const displayName=placeField(place,'name');
    const photo=card.querySelector('.food-photo');if(photo && photo.alt)photo.alt=displayName+'の写真';
    card.querySelector('.favorite-button')?.setAttribute('aria-label',displayName+'を保存');
    card.querySelector('.rating-summary')?.setAttribute('aria-label',displayName+'の平均評価と評価人数');
    const menu=card.querySelector('.menu-name');if(menu){menu.title=menu.textContent;menu.setAttribute('aria-label',menu.textContent);}
    const address=placeField(place,'address');
    if(address && address!==place.address){const line=document.createElement('p');line.className='localized-address';line.textContent=address;line.style.cssText='font-size:12px;color:#5e6d63;margin:8px 0;line-height:1.5';card.querySelector('.local-name')?.after(line);}
    set('.price',yenPrice(place.price?.amount,place.country.currency));
    card.querySelectorAll('.additional-menu').forEach(row=>{
      const name=row.querySelector('.menu-name'),price=row.querySelector('.price');
      if(name){name.textContent=menuField(place,row.dataset.menuName||name.textContent,row.dataset.menuLocalName||'');name.title=name.textContent;name.setAttribute('aria-label',name.textContent);}
      if(price)price.textContent=yenPrice(Number(row.dataset.menuAmount),place.country.currency);
    });
    const note=card.querySelector('.note');if(note && place.note)note.textContent=placeField(place,'note');
    snapshots.filter(s=>!s.el.matches('h3,.local-name,.location span,.category,.menu-name,.price,.note')).forEach(({el,text})=>el.textContent=t(text));
  };
  bound.add({card,update});update();
}
const originalTitle=document.title;
function updateSearch(){const input=document.querySelector("#search");if(input)input.placeholder=japanese()?"お店・ホテル・都市・料理・YouTuberを検索":"가게·호텔·도시·음식·유튜버 검색";document.title=japanese()?"YouTuberのグルメマップ・観光スポット | トンドラク旅行":originalTitle;}
function refresh(){updateSearch();document.documentElement.lang=language;translateUI();for(const item of bound){if(!item.card.isConnected){bound.delete(item);continue;}item.update();}}
const selector=document.querySelector('#display-language');
if(selector){selector.value=language;selector.addEventListener('change',async()=>{const requested=selector.value==='ja'?'ja':'ko';selector.disabled=true;try{if(requested==='ja')await loadTranslations();language=requested;try{localStorage.setItem('tongdorak:language',language);}catch{}refresh();window.dispatchEvent(new Event("tong-language-changed"));}catch{selector.value=language;const status=document.querySelector('#page-status');if(status)status.textContent='言語データを読み込めませんでした。もう一度お試しください。';}finally{selector.disabled=false;}});}
new MutationObserver(()=>translateUI()).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']});
window.addEventListener('tong-fx-updated',refresh);
translateUI();document.documentElement.lang=language;


updateSearch();
