import {account,favoriteKeys,toggleAccountFavorite,savedFolders,assignSavedFolder} from './account-store.mjs';
export function openSavePlace(place,onChange){
 const owner=account(),key=place.country.id+'/'+place.id,d=document.createElement('dialog');d.className='rating-dialog';
 const title=document.createElement('h2');title.textContent='장소 저장';const body=document.createElement('div');d.append(title,body);
 const btn=(name,fn)=>{const b=document.createElement('button');b.textContent=name;b.type='button';b.onclick=()=>{if(account()!==owner){d.close();return}try{fn();onChange();render()}catch{const p=document.createElement('p');p.textContent='저장하지 못했어요. 다시 시도해 주세요.';body.append(p)}};return b};
 function render(){body.replaceChildren();const saved=favoriteKeys().has('tong-food-travel:favorite:'+key);body.append(btn(saved?'✓ 전체 저장 · 저장 해제':'전체 저장에 추가',()=>toggleAccountFavorite(place)));
 if(account()){for(const f of savedFolders())body.append(btn((f.value.places?.[key]?'✓ ':'')+f.value.name,()=>assignSavedFolder(place,f.key)));const label=document.createElement('label');label.textContent='새 여행 폴더';const input=document.createElement('input');input.maxLength=100;input.placeholder='폴더 이름';label.append(input);body.append(label,btn('폴더 만들고 저장',()=>{if(input.value.trim())assignSavedFolder(place,null,input.value.trim())}))}
 else{const p=document.createElement('p');p.textContent='Google 로그인 후 여행 폴더와 앱에 함께 저장할 수 있어요.';body.append(p)}
 }
 d.append(btn('닫기',()=>d.close()));document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});render();d.showModal();
}

