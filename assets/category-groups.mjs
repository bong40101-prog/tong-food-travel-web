export const ids=id=>id==='noodle-group'?['ramen','noodles']:id==='other-group'?['street','other']:[id];
export function foodName(id,country,fallback=id){
 if(['ramen','noodles','noodle-group'].includes(id))return {JP:'라멘·면 요리',VN:'쌀국수·면 요리',IT:'파스타·면 요리',KR:'국수·면 요리',CN:'중국 면 요리',TH:'팟타이·면 요리'}[country]||'면 요리';
 return ({sushi:country==='JP'?'스시·해산물':'해산물',meat:country==='JP'?'고기·가츠':'고기 요리',rice:({JP:'덮밥·정식',VN:'껌·밥 요리',IT:'리소토·밥 요리'}[country]||'밥·정식'),izakaya:country==='JP'?'이자카야':'술집·바',dessert:'카페·디저트',street:'그 외 음식',other:'그 외 음식','other-group':'그 외 음식',curry:'카레',attraction:'여행지'})[id]||fallback;
}
export function choices(categories,country){
 return [...new Map(categories.map(item=>{
  const id=['ramen','noodles'].includes(item.id)?'noodle-group':['street','other'].includes(item.id)?'other-group':item.id;
  return [id,{id,name:foodName(id,country,item.name)}];
 })).values()];
}
const rank=place=>{const n=['박범 ParkBeom','김제법','유우키'].findIndex(channel=>place.videos?.some(v=>v.channel===channel));return n>=0?n:place.image?.path?3:4;};
export class GroupedCatalog {
 async load(input,page,fetcher){
  const key=JSON.stringify(input);
  if(page===1||this.key!==key||this.last+1!==page){this.key=key;this.last=0;this.streams=ids(input.category).map(category=>({category,buffer:[],next:1,total:0}));}
  let result;
  while(this.last<page){
   const places=[];let base;
   while(places.length<18){
    for(const stream of this.streams)if(!stream.buffer.length&&stream.next){
     base=await fetcher({...input,category:stream.category,page:stream.next});stream.buffer.push(...base.places);stream.next=base.nextPage;stream.total=base.total;this.base=base;
    }
    const stream=this.streams.filter(s=>s.buffer.length).sort((a,b)=>rank(a.buffer[0])-rank(b.buffer[0]))[0];
    if(!stream)break;places.push(stream.buffer.shift());
   }
   this.last++;
   result={...this.base,places,total:this.streams.reduce((sum,s)=>sum+s.total,0),featured:false,hasFeatured:false,
    filters:{...this.base.filters,category:input.category},nextPage:this.streams.some(s=>s.next||s.buffer.length)?this.last+1:null};
  }
  return result;
 }
}
