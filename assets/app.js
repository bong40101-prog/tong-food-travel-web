import { account, favoriteKeys, toggleAccountFavorite } from './account-store.mjs';
import { locationLabel } from './location-label.mjs';
import { choices, foodName, ids, GroupedCatalog } from './category-groups.mjs?v=20261112-store-menu';
const groupedCatalog = new GroupedCatalog();
import { attachWon, refreshRates } from './exchange.mjs?v=20261112-price-order';
import { mapUrl, timestamp, videoUrl } from './filters.mjs?v=20261110-video-policy';
import { requestFoodApi } from './food-api.mjs?v=20261112-admin-auth2';

const $ = (selector, scope = document) => scope.querySelector(selector);
const search = $('#search');
const cards = $('#cards');
const more = $('#load-more');
const pageStatus = $('#page-status');
const region = $('#region');
const city = $('#city');
const favoritesToggle = $('#favorites-toggle');
const favoriteStatus = $('#favorite-status');
const favoritePrefix = 'tong-food-travel:favorite:';
const state = { query: '', continent: '', country: '', category: '', region: '', city: '', favoritesOnly: false };
let pendingRequest;
let searchTimer;
let nextPage = null;
let favorites = readFavorites();
let catalog;
let generation = 0;

function readFavorites() { try { return favoriteKeys(); } catch { return new Set(); } }
window.addEventListener('tong-account-changed',()=>{
 favorites=readFavorites();
 const hint=$('#favorite-hint');if(hint)hint.textContent=account()?'Google 계정에 찜이 동기화됩니다.':'로그인하지 않은 찜은 이 브라우저에만 저장됩니다.';
 if(catalog && state.favoritesOnly)render();else cards.querySelectorAll('.favorite-button').forEach(updateFavoriteButton);
});

function favoriteKey(place) {
  return `${favoritePrefix}${place.country.id}/${place.id}`;
}

function updateFavoriteButton(button) {
  const saved = favorites.has(button.dataset.favoriteKey);
  button.setAttribute('aria-pressed', String(saved));
  button.title = saved ? '즐겨찾기 해제' : '즐겨찾기 저장';
}

async function toggleFavorite(place, button) {
  const key = favoriteKey(place);
  let saved;
  try {
    saved = toggleAccountFavorite(place);
  } catch {
    favoriteStatus.classList.remove('sr-only');
    favoriteStatus.textContent = '이 브라우저에서 즐겨찾기를 저장할 수 없어요.';
    return;
  }

  if (saved) favorites.add(key);
  else favorites.delete(key);
  updateFavoriteButton(button);
  favoriteStatus.classList.add('sr-only');
  favoriteStatus.textContent = `${place.name} 즐겨찾기 ${saved ? '저장' : '해제'}`;
  if (state.favoritesOnly) {
    const restoreFocus = document.activeElement === button;
    const next = button.closest('.card').nextElementSibling ?? button.closest('.card').previousElementSibling;
    const nextKey = next?.querySelector('.favorite-button').dataset.favoriteKey;
    await render();
    if (restoreFocus && document.activeElement === document.body) {
      const target = nextKey ? $(`.favorite-button[data-favorite-key="${CSS.escape(nextKey)}"]`) : null;
      (target ?? favoritesToggle).focus();
    }
  }
}

async function readJson(path) {
  const response = await fetch(new URL(`../${path}`, import.meta.url), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function button(text, selected, action) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.setAttribute('aria-pressed', String(selected));
  element.addEventListener('click', action);
  return element;
}

function clearFilters() {
  state.category = '';
  state.region = '';
  state.city = '';
}

function setRegion(continent, country) {
  state.favoritesOnly = false;
  state.continent = continent;
  state.country = country;
  clearFilters();
  render();
}

function renderRegion() {
  const continentSelect = $('#continent-select');
  const countrySelect = $('#country-select');
  continentSelect.replaceChildren(new Option('모든 대륙',''),...catalog.continents.map(c=>new Option(c.name,c.id)));
  continentSelect.value=state.continent;
  countrySelect.replaceChildren(new Option('모든 국가',''),...catalog.countries.filter(c=>!state.continent || c.continent===state.continent).map(c=>new Option(c.name,c.id)));
  countrySelect.value=state.country;
  continentSelect.onchange=()=>setRegion(continentSelect.value,'');
  countrySelect.onchange=()=>{const c=catalog.countries.find(c=>c.id===countrySelect.value);setRegion(state.continent,c?.id||'');};
}


function formatPrice(price, currency) {
  if (!price) return '가격 미확인';
  if (price.amount === 0) return '무료';
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(price.amount);
}

function renderCard(place) {
  const card = $('#card-template').content.firstElementChild.cloneNode(true);
  const favorite = $('.favorite-button', card);
  favorite.dataset.favoriteKey = favoriteKey(place);
  favorite.setAttribute('aria-label', `${place.name} 즐겨찾기`);
  favorite.addEventListener('click', () => toggleFavorite(place, favorite));
  updateFavoriteButton(favorite);
  const photo = $('.food-photo', card);
  const credit = $('.photo-credit', card);
  if (place.image) {
    photo.src = `./${place.image.path}`;
    photo.alt = place.image.alt;
    credit.href = `./sources.html#${place.image.credit}`;
  } else if (place.videoThumbnail) {
    const thumbnail = place.videoThumbnail;
    const fallback = `https://i.ytimg.com/vi/${thumbnail.videoId}/hqdefault.jpg`;
    const hideThumbnail = () => {
      photo.hidden = true;
      credit.hidden = true;
      $('.card-photo', card).classList.add('card-photo-compact');
    };
    const retryThumbnail = () => {
      if (photo.src !== fallback) photo.src = fallback;
      else hideThumbnail();
    };
    photo.addEventListener('error', retryThumbnail);
    photo.addEventListener('load', () => {
      if (photo.naturalWidth <= 120) retryThumbnail();
    });
    photo.src = thumbnail.url;
    photo.alt = thumbnail.alt;
    credit.href = thumbnail.source;
    credit.textContent = `유튜브 썸네일 · ${thumbnail.channel}`;
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
  } else {
    photo.hidden = true;
    credit.hidden = true;
    $('.card-photo', card).classList.add('card-photo-compact');
  }
  $('.category', card).textContent = place.storeType?.name || foodName(place.category, place.country.id, place.categoryName);
  $('.location span', card).textContent = locationLabel(place.region?.name ?? place.country.name, place.city, place.area);
  $('h3', card).textContent = place.name;
  const localName = $('.local-name', card);
  localName.textContent = place.localName;
  localName.hidden = place.localName === place.name;
  $('.menu-label', card).textContent = place.category === 'attraction' ? '관람 정보' : '대표 메뉴';
  $('.menu-name', card).textContent = place.menu;
  $('.price', card).textContent = formatPrice(place.price, place.country.currency);
  attachWon($('.price-block', card), place);
  const priceSource = $('.price-source', card);
  if (place.price) {
    priceSource.href = place.price.source;
    const label = place.price.label ?? '가격 근거';
    const supplied = label.startsWith('제공 엑셀 기재 가격');
    const period = supplied ? label.match(/(20\d{2}\.\d{2}) 영상 기준/)?.[1] : null;
    priceSource.textContent = supplied
      ? `제공 자료 · ${period ? `${period} 영상 가격` : '가격 기준 미확인'}`
      : `${label} · ${place.price.date.replaceAll('-', '.')}`;
    priceSource.title = label;
    priceSource.setAttribute('aria-label', label);
  } else {
    priceSource.hidden = true;
  }
  const note = $('.note', card);
  note.textContent = place.note ?? '';
  note.hidden = !place.note;
  const placeSource = $('.place-source', card);
  if (place.addressSource) {
    placeSource.href = place.addressSource;
    placeSource.textContent = place.category === 'attraction' ? '장소 정보 출처' : '매장 정보 출처';
    placeSource.hidden = false;
  }

  for (const video of place.videos) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = videoUrl(video);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.classList.add('icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-play');
    icon.append(use);
    const info = document.createElement('span');
    const channel = document.createElement('strong');
    channel.textContent = video.channel;
    const reason = document.createElement('small');
    reason.textContent = video.verification === 'user-supplied' ? '제공 자료의 영상 · 장면 미검증' : video.relation === 'recommended' ? '영상에서 추천' : '영상에 나온 장소';
    info.append(channel, reason);
    const label = document.createElement('span');
    label.className = 'video-action';
    label.textContent = video.seconds == null ? '원본 보기' : `영상 ${timestamp(video.seconds)}`;
    link.append(icon, info, label);
    item.append(link);
    $('.video-sources', card).append(item);
  }
  $('.map-link', card).href = mapUrl(place);
  return card;
}

function renderFilters(filters, query, hasFeatured) {
  const regionOptions = catalog.countries.flatMap(country => country.regions ?? [])
    .filter(entry => filters.regions.includes(entry.id));
  state.region = filters.region;
  state.city = filters.city;
  state.category = filters.category;
  region.replaceChildren(new Option('모든 권역', ''), ...regionOptions.map(entry => new Option(entry.name, entry.id)));
  region.value = state.region;
  region.disabled = regionOptions.length === 0;
  region.closest('label').hidden = region.disabled;
  city.replaceChildren(new Option('모든 도시', ''), ...filters.cities.map(name => new Option(name, name)));
  city.value = state.city;
  city.disabled = filters.cities.length === 0;

  const defaultLabel = '전체';
  const chips = [{ id: '', name: defaultLabel }, ...choices(catalog.categories ?? filters.categories, state.country)].map(category => button(
    category.name, category.id === state.category, () => {
      state.category = category.id;
      render();
    }
  ));
  $('#filters').replaceChildren(...chips);
}

function showEmpty(title, text, resetLabel) {
  $('#empty-title').textContent = title;
  $('#empty-text').textContent = text;
  $('#reset').textContent = resetLabel;
  $('#empty').hidden = false;
}

function warnSearchLimit(seconds) {
  const dialog = $('#search-limit-dialog');
  let wait = '잠시 후';
  if (seconds >= 3600) wait = '1시간 후';
  else if (seconds > 0) wait = `약 ${Math.ceil(seconds / 60)}분 후`;
  const message = `검색 요청이 너무 많아 검색이 제한됐어요. ${wait}에 다시 검색할 수 있어요.`;
  $('#search-limit-message', dialog).textContent = message;
  if (!dialog.open) dialog.showModal();
  return message;
}

async function fetchPage(page, query, signal) {
 const input={continent:state.continent,country:state.country,query,fullList:true,
  region:state.region,city:state.city,category:state.category,favorites:state.favoritesOnly?[...favorites].map(key=>key.slice(favoritePrefix.length)):null};
 async function fetcher(payload){
  const response=await requestFoodApi('tongfood-catalog',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify(payload)});
  if(!response.ok){const details=await response.json().catch(()=>({}));if(details.adminCheck)console.warn('Catalog authentication:',details.adminCheck);const error=new Error('Catalog request failed');error.status=response.status;if(response.status===429)error.retryAfter=Number(response.headers.get('Retry-After'));throw error;}
  return response.json();
 }
 return ids(input.category).length>1 ? groupedCatalog.load(input,page,fetcher) : fetcher({...input,page});
}

async function render(page = 1) {
  clearTimeout(searchTimer);
  const request = ++generation;
  pendingRequest?.abort();
  pendingRequest = new AbortController();
  const append = page > 1;
  const query = state.query.trim();
  const currentCountry = catalog.countries.find(country => country.id === state.country);
  const currentContinent = catalog.continents.find(continent => continent.id === state.continent);
  const favoritesOnly = state.favoritesOnly;
  favoritesToggle.setAttribute('aria-pressed', String(favoritesOnly));
  $('#result-eyebrow').textContent = favoritesOnly ? '저장한 장소' : [currentContinent?.name || '모든 대륙', currentCountry?.name || '모든 국가'].join(' / ');
  $('#places-title').textContent = favoritesOnly ? '내 즐겨찾기' : query ? `${currentCountry?.name || currentContinent?.name || '전체'} 검색 결과` : currentCountry ? `${currentCountry.name} 맛집과 여행지` : `${currentContinent?.name || '전체'} 맛집과 여행지`;
  $('#favorite-hint').hidden = !favoritesOnly;
  if (!append) {
    renderRegion();
    city.replaceChildren(new Option('도시 불러오는 중…',''));city.disabled=true;
    nextPage = null;
    more.hidden = true;
  }
  more.disabled = true;
  pageStatus.textContent = '';
  cards.setAttribute('aria-busy', 'true');
  $('#empty').hidden = true;

  try {
    const results = await fetchPage(page, query, pendingRequest.signal);
    if (request !== generation) return;
    renderFilters(results.filters, query, results.hasFeatured);
    if (results.featured) $('#places-title').textContent = `${currentCountry.name} 대표 식당`;
    else if (!favoritesOnly && !query && state.region) $('#places-title').textContent = `${region.selectedOptions[0].text} 맛집과 여행지`;
    $('#count').textContent = results.featured ? `대표 ${results.total}곳 · 전체 ${results.scopeTotal}곳` : `장소 ${results.total}곳`;
    $('#browse-hint').hidden = !results.featured;
    const rendered = results.places.map(renderCard);
    if (append) {
      cards.append(...rendered);
      if (rendered.length) pageStatus.textContent = `${rendered.length}곳을 더 표시했어요.`;
    } else {
      cards.replaceChildren(...rendered);
    }
    nextPage = results.nextPage;
    more.hidden = nextPage === null;
    if (results.total === 0) {
      if (favoritesOnly && results.scopeTotal === 0) {
        showEmpty('저장한 장소가 없어요', '식당이나 여행지 카드의 별을 눌러 저장해 보세요.', '장소 둘러보기');
      } else if (!query && !currentCountry) {
        showEmpty('아직 등록된 장소가 없어요', '선택한 지역을 바꾸거나 모든 대륙·모든 국가를 선택해 보세요.', '일본 둘러보기');
      } else {
        showEmpty('조건에 맞는 장소가 없어요', '검색어나 음식 종류, 도시를 바꿔 보세요.', '검색과 필터 초기화');
      }
    }
  } catch (error) {
    if (request !== generation) return;
    const limited = error.status === 429;
    const retry = limited ? warnSearchLimit(error.retryAfter) : '네트워크 연결을 확인하거나 다시 불러와 주세요.';
    if (append) {
      pageStatus.textContent = retry;
    } else {
      cards.replaceChildren();
      $('#count').textContent = '';
      $('#browse-hint').hidden = true;
      showEmpty(limited ? '검색 요청이 제한됐어요' : '장소 목록을 불러오지 못했어요', retry, '다시 불러오기');
    }
    console.error(error);
  } finally {
    if (request === generation) {
      cards.setAttribute('aria-busy', 'false');
      more.disabled = false;
    }
  }
}

more.addEventListener('click', () => {
  if (nextPage !== null) render(nextPage);
});

favoritesToggle.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  state.query = '';
  search.value = '';
  clearFilters();
  render();
});

window.addEventListener('storage', event => {
  if (event.storageArea !== localStorage || (event.key !== null && !event.key.startsWith(favoritePrefix))) return;
  favorites = readFavorites();
  if (state.favoritesOnly) render();
  else cards.querySelectorAll('.favorite-button').forEach(updateFavoriteButton);
});

search.addEventListener('input', () => {
  if (!catalog) return;

  state.query = search.value;
  clearTimeout(searchTimer);
  generation++;
  pendingRequest?.abort();
  more.hidden = true;
  searchTimer = setTimeout(render, 280);
});

$('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  if (catalog) render();
  $('#places').scrollIntoView({ block: 'start' });
});

city.addEventListener('change', () => {
  state.city = city.value;
  render();
});

region.addEventListener('change', () => {
  state.region = region.value;
  state.city = '';
  state.category = '';
  render();
});

$('#reset').addEventListener('click', () => {
  if (!catalog) {
    start();
    return;
  }
  if ($('#reset').textContent === '다시 불러오기') {
    render();
    return;
  }
  if (state.favoritesOnly && $('#reset').textContent !== '장소 둘러보기') {
    state.query = '';
    search.value = '';
    clearFilters();
    render();
    return;
  }
  state.query = '';
  search.value = '';
  clearFilters();
  render();
});

async function start() {
  try {
    catalog = await readJson('data/countries.json');
    const country = catalog.countries.find(entry => entry.id === catalog.defaultCountry);
    state.continent = country.continent;
    state.country = country.id;
    state.query = search.value;
    favoritesToggle.disabled = false;
    render();
  } catch (error) {
    cards.setAttribute('aria-busy', 'false');
    showEmpty('지역 목록을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.', '다시 불러오기');
    console.error(error);
  }
}

start();



refreshRates();

