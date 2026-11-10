export function normalize(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('ko')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function matchesQuery(place, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  const fields = [
    place.name, place.localName, place.city, place.area, place.menu,
    place.country.name, ...place.country.keywords, place.categoryName, place.region?.searchName ?? place.region?.name,
    ...(place.region?.keywords ?? []),
    ...place.keywords, ...place.videos.map(video => video.channel)
  ];
  const searchable = normalize(fields.join(' ')).replaceAll(' ', '');
  return tokens.every(token => searchable.includes(token));
}

const preferredCreators = ['박범 ParkBeom', '김제법', '유우키'];

function creatorRank(place) {
  const rank = preferredCreators.findIndex(channel => place.videos.some(video => video.channel === channel));
  return rank === -1 ? preferredCreators.length : rank;
}

export function comparePlaceCreators(a, b) {
  return creatorRank(a) - creatorRank(b);
}

// These Korean channels are stored under English names in the source data.
const koreanChannelAliases = new Set(['AIR SEOUL', 'Suzie ahn', "UNIII's meal"]);

function isKoreanChannel({ channel }) {
  return /\p{Script=Hangul}/u.test(channel) || koreanChannelAliases.has(channel);
}

function isConfirmedVisit(video) {
  return video.relation === 'visited' && video.verification !== 'user-supplied';
}

export function cardVideos(place) {
  const limit = place.image?.path || place.videoThumbnail?.url ? 2 : 5;
  return [...place.videos]
    .sort((a, b) => Number(isKoreanChannel(b)) - Number(isKoreanChannel(a))
      || Number(isConfirmedVisit(b)) - Number(isConfirmedVisit(a)))
    .slice(0, limit);
}

export function mapUrl(place) {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  const query = place.coordinates?.join(',') ?? [place.localName, place.address].filter(Boolean).join(' ');
  url.searchParams.set('query', query);
  if (place.placeId) url.searchParams.set('query_place_id', place.placeId);
  return url.href;
}

export function videoUrl(video) {
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', video.id);
  if (video.seconds > 0) url.searchParams.set('t', `${video.seconds}s`);
  return url.href;
}

export function timestamp(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
