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
  additionalMenus(place).forEach(menu => {
    const row = document.createElement('div'); row.className = 'menu-line additional-menu';
    const description = document.createElement('div');
    const name = document.createElement('strong'); name.className = 'menu-name'; name.textContent = menu.name;
    description.append(name);
    const prices = document.createElement('div'); prices.className = 'price-block';
    const local = document.createElement('strong'); local.className = 'price'; local.textContent = formatPrice(menu.price, place.country.currency);
    prices.append(local); attachWon(prices, {price: menu.price, country: place.country});
    row.append(description, prices); previous.after(row); previous = row;
  });
}