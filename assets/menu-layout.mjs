import {representativeMenuNames,verifiedMenus} from './verified-menus.mjs?v=20261117-bilingual';
export function bilingualMenuName(name, localName) {
  const korean=String(name||'').trim(), local=String(localName||'').trim();
  if (!local || korean===local) return korean;
  // Existing original-language suffixes must not be appended a second time.
  const existing=korean.match(/\s*\(([^()]*)\)\s*$/);
  if (existing && /[ぁ-ヿ一-鿿]/.test(existing[1])) return korean;
  return `${korean} (${local})`;
}
export function representativeMenuName(place) {
  const fallback=representativeMenuNames[`${place.country?.id}/${place.id}`];
  return bilingualMenuName(place.menu,place.menuLocalName || (fallback?.name===place.menu ? fallback.localName : ''));
}
export function additionalMenus(place) {
  const seen = new Set([String(place.menu || '').trim()]);
  return (Array.isArray(place.additionalMenus) ? place.additionalMenus : []).filter(menu => {
    const name = typeof menu?.name === 'string' ? menu.name.trim() : '';
    if (!name || seen.has(name)) return false;
    seen.add(name); return true;
  }).slice(0, 2);
}
export function attachAdditionalMenus(card, place, formatPrice, attachWon) {
  card.querySelectorAll('.price-source').forEach(source => source.remove());
  if (place.category === 'attraction') return;
  let previous = card.querySelector('.menu-line');
  previous.querySelector('.menu-name').textContent=representativeMenuName(place);
  additionalMenus(place).forEach(menu => {
    const row = document.createElement('div'); row.className = 'menu-line additional-menu';
    const description = document.createElement('div');
    const fallback=verifiedMenus[`${place.country?.id}/${place.id}`]?.find(item=>item.name===menu.name);
    const name = document.createElement('strong'); name.className = 'menu-name'; name.textContent = bilingualMenuName(menu.name,menu.localName||fallback?.localName);
    description.append(name);
    const prices = document.createElement('div'); prices.className = 'price-block';
    const local = document.createElement('strong'); local.className = 'price'; local.textContent = formatPrice(menu.price, place.country.currency);
    prices.append(local); attachWon(prices, {price: menu.price, country: place.country});
    row.append(description, prices); previous.after(row); previous = row;
  });
  card.querySelectorAll('.menu-name').forEach(name => {
    name.title = name.textContent;
    name.tabIndex = 0;
    name.setAttribute('role', 'button');
    name.setAttribute('aria-label', `${name.textContent} 전체 이름 보기`);
    const showName = event => {
      event.preventDefault(); event.stopPropagation();
      const dialog = document.createElement('dialog');
      const text = document.createElement('p'); text.textContent = name.textContent;
      const close = document.createElement('button'); close.textContent = '닫기';
      close.onclick = () => dialog.close();
      dialog.append(text, close); document.body.append(dialog);
      dialog.addEventListener('close', () => dialog.remove(), {once:true});
      dialog.showModal();
    };
    name.addEventListener('click', showName);
    name.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') showName(event);
    });
  });
}