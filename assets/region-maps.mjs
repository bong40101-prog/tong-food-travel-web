const cache=new Map();
const normalize=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const ns='http://www.w3.org/2000/svg';
function shape(rings,fill){
 const path=document.createElementNS(ns,'path');path.setAttribute('fill',fill);
 path.setAttribute('d',(rings||[]).map(ring=>ring.map((point,index)=>(index?'L':'M')+point.join(',')).join(' ')+'Z').join(' '));return path;
}
function picture(map,id,name,city){
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('role','img');
 svg.append(shape(map.country,'#d8ddd5'));
 const area=map.regions[normalize(id)]||map.regions[normalize(name)];
 const point=city?(map.cities[normalize(name)]||map.cities[normalize(name.replace(/시$/,''))]):null;
 if(city&&point){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',point[0]);dot.setAttribute('cy',point[1]);dot.setAttribute('r','3.5');dot.setAttribute('fill','#151915');dot.setAttribute('stroke','white');svg.append(dot);}
 else if(!city&&area)svg.append(shape(map.areas[area],'#151915'));
 svg.setAttribute('aria-label',name+(point||area?' 위치':' · 세부 위치 정보 없음'));return svg;
}
let generation=0;
export async function renderDestinationMaps(country,cities,choose){
 const current=++generation;
 let section=document.getElementById('destination-maps');
 if(!section){section=document.createElement('section');section.id='destination-maps';document.getElementById('filters').closest('.filter-row').before(section);}
 section.replaceChildren();section.hidden=!country;if(!country)return;
 const heading=document.createElement('h2');heading.textContent='어디로 떠나볼까요?';section.append(heading);
 const isCity=!country.regions?.length;const entries=isCity?cities.map(name=>({id:name,name})):country.regions;
 if(!entries.length){section.hidden=true;return;}
 const grid=document.createElement('div');grid.className='destination-map-grid';section.append(grid);
 const caption=document.createElement('p');caption.textContent='검정 영역은 권역, 검정 점은 도시 위치예요.';section.append(caption);
 const source=document.createElement('a');source.href='./map-sources.html';source.textContent='지도 출처 · Natural Earth / GeoNames';section.append(source);
 let expanded=false;
 const more=document.createElement('button');more.type='button';more.textContent='전체 보기';if(entries.length>8)section.append(more);
 let map=cache.get(country.id);
 function draw(){
  grid.replaceChildren(...(expanded?entries:entries.slice(0,8)).map(item=>{
   const button=document.createElement('button');button.type='button';button.className='destination-map-tile';
   if(map)button.append(picture(map,item.id,item.name,isCity));
   const label=document.createElement('span');label.textContent=item.name;button.append(label);
   button.onclick=()=>choose(item.id,isCity);return button;
  }));more.textContent=expanded?'접기':'전체 보기';
 }
 more.onclick=()=>{expanded=!expanded;grid.classList.toggle('expanded',expanded);more.setAttribute('aria-expanded',String(expanded));draw()};draw();
 if(!map)try{
  const response=await fetch(`https://tongdorak-benefits.bong40101.workers.dev/maps/${country.id}.json`);
  if(!response.ok)throw Error();map=await response.json();cache.set(country.id,map);if(current===generation)draw();
 }catch{caption.textContent='지도를 불러오지 못했어요. 지역 이름으로 선택할 수 있습니다.';}
}
