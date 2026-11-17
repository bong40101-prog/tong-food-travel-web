export function additionalMenus(place) {
  const seen = new Set([String(place.menu || '').trim()]);
  return (Array.isArray(place.additionalMenus) ? place.additionalMenus : []).filter(menu => {
    const name = typeof menu?.name === 'string' ? menu.name.trim() : '';
    if (!name || seen.has(name)) return false;
    seen.add(name); return true;
  }).slice(0, 2);
}
export function attachAdditionalMenus(card, place, formatPrice, attachWon) {
  if (place.category === 'attraction') return;
  let previous = card.querySelector('.menu-line');
  additionalMenus(place).forEach((menu, index) => {
    const row = document.createElement('div'); row.className = 'menu-line additional-menu';
    const description = document.createElement('div');
    const label = document.createElement('span'); label.className = 'menu-label'; label.textContent = `추가 메뉴 ${index + 1}`;
    const name = document.createElement('strong'); name.className = 'menu-name'; name.textContent = menu.name;
    description.append(label, name);
    const prices = document.createElement('div'); prices.className = 'price-block';
    const local = document.createElement('strong'); local.className = 'price'; local.textContent = formatPrice(menu.price, place.country.currency);
    prices.append(local); attachWon(prices, {price: menu.price, country: place.country});
    if (/^https?:\/\//.test(menu.price?.source || '')) {
      const source = document.createElement('a'); source.className = 'price-source'; source.href = menu.price.source;
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      source.textContent = [menu.price.label || '가격 출처', menu.price.date].filter(Boolean).join(' · ');
      prices.append(source);
    }
    row.append(description, prices); previous.after(row); previous = row;
  });
}