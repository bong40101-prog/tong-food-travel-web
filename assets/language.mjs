import {conversion} from './exchange.mjs?v=20261112-price-order';
const data=await fetch(new URL('./ja-pilot.json?v=20261124',import.meta.url)).then(r=>{if(!r.ok)throw Error('translations');return r.json();}).catch(()=>({ui:{},places:{}}));
let language='ko';
try {language=localStorage.getItem('tongdorak:language')==='ja'?'ja':'ko';} catch {}
export const japanese=()=>language==='ja';
export const t=value=>japanese()?(data.ui[value]||value):value;
export function placeField(place,key) {
  if(!japanese())return place[key]||'';
  const translated=data.places[place.id]?.[key];if(translated)return translated;
  const local=key==='name'?place.localName:key==='menu'?place.menuLocalName:null;
  if(place.country?.id==='JP' && local && !/[가-힣]/.test(local))return local;
  return t(place[key]||'');
}
export function yenPrice(amount,currency) {
  if(!Number.isFinite(amount))return '価格未確認';
  const nf=new Intl.NumberFormat('ja-JP');
  if(currency==='JPY')return '¥'+nf.format(amount);
  if(currency!=='KRW')return new Intl.NumberFormat('ja-JP',{style:'currency',currency}).format(amount);
  const inverse=conversion(1,'JPY');
  return '₩'+nf.format(amount)+(inverse?'（約 ¥'+nf.format(Math.round(amount/inverse.value))+'）':'（円換算なし）');
}
const originals=new WeakMap();
function translateUI(root=document.body) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) {
    const node=walker.currentNode;
    if(node.parentElement?.closest('script,style'))continue;
    let saved=originals.get(node);
    if(!saved || (node.nodeValue!==saved.ko && node.nodeValue!==saved.ja)) {
      const trimmed=node.nodeValue.trim();if(!data.ui[trimmed])continue;
      saved={ko:node.nodeValue,ja:node.nodeValue.replace(trimmed,data.ui[trimmed])};originals.set(node,saved);
    }
    const value=japanese()?saved.ja:saved.ko;if(node.nodeValue!==value)node.nodeValue=value;
  }
}
const bound=new Set();
export function localizeCard(card,place) {
  card.dataset.localeContent='';
  const snapshots=[...card.querySelectorAll('h3,.local-name,.location span,.category,.menu-name,.menu-label,.price,.note,.place-source')].map(el=>({el,text:el.textContent,hidden:el.hidden}));
  const update=()=>{
    snapshots.forEach(({el,text,hidden})=>{el.textContent=text;el.hidden=hidden;});
    card.querySelectorAll('.yen-price').forEach(e=>e.remove());
    card.querySelectorAll('.won-price').forEach(e=>e.hidden=japanese());
    if(!japanese())return;
    const set=(selector,text)=>{const el=card.querySelector(selector);if(el)el.textContent=text;};
    set('h3',placeField(place,'name'));
    const local=card.querySelector('.local-name');if(local)local.hidden=true;
    set('.location span',[t(place.country.name),placeField(place,'city'),placeField(place,'area')].filter(Boolean).join(' · '));
    set('.category',t(place.storeType?.name||place.categoryName||'해산물'));
    set('.menu-label','おすすめメニュー');set('.menu-name',placeField(place,'menu'));
    set('.price',yenPrice(place.price?.amount,place.country.currency));
    const note=card.querySelector('.note');if(note && place.note)note.textContent='原文の案内：'+place.note;
    snapshots.filter(s=>!s.el.matches('h3,.local-name,.location span,.category,.menu-name,.price,.note')).forEach(({el,text})=>el.textContent=t(text));
  };
  bound.add({card,update});update();
}
function updateSearch(){const input=document.querySelector("#search");if(input)input.placeholder=japanese()?"お店・ホテル・都市・料理・YouTuberを検索":"가게·호텔·도시·음식·유튜버 검색";}
function refresh(){updateSearch();document.documentElement.lang=language;translateUI();for(const item of bound){if(!item.card.isConnected){bound.delete(item);continue;}item.update();}}
const selector=document.querySelector('#display-language');
if(selector){selector.value=language;selector.addEventListener('change',()=>{language=selector.value==='ja'?'ja':'ko';try{localStorage.setItem('tongdorak:language',language);}catch{}refresh();});}
new MutationObserver(()=>translateUI()).observe(document.body,{childList:true,subtree:true,characterData:true});
window.addEventListener('tong-fx-updated',refresh);
translateUI();document.documentElement.lang=language;


updateSearch();
