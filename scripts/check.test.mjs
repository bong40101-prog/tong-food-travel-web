import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { requestFoodApi } from '../assets/food-api.mjs';
import { matchesQuery, mapUrl, timestamp, videoUrl } from '../assets/filters.mjs';

const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url)));
const catalog = await read('data/countries.json');
const credits = await read('assets/images/credits.json');
const https = value => assert.equal(new URL(value).protocol, 'https:');

test('the public site contains taxonomy and credits without a bulk place export', async () => {
  assert.ok(catalog.countries.some(country => country.id === catalog.defaultCountry));
  assert.equal(new Set(catalog.countries.map(country => country.id)).size, catalog.countries.length);
  for (const country of catalog.countries) {
    assert.ok(catalog.continents.some(continent => continent.id === country.continent));
    assert.ok(!Object.hasOwn(country, 'file'));
  }
  const publicFiles = await readdir(new URL('../data/', import.meta.url), { recursive: true });
  assert.deepEqual(publicFiles.filter(path => path.endsWith('.json')), ['countries.json']);
  for (const credit of Object.values(credits)) {
    await access(new URL(`../assets/images/${credit.file}`, import.meta.url));
    https(credit.source);
    https(credit.licenseUrl);
  }
});

test('the registered HTTPS address and verification tag remain published', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/food\.tongapp\.co\.kr\/">/);
  assert.match(html, /<meta name="naver-site-verification" content="[a-f0-9]+">/);
  assert.match(sitemap, /<loc>https:\/\/food\.tongapp\.co\.kr\/<\/loc>/);
  assert.doesNotMatch(sitemap, /github\.io/);
});

test('search can match names, category and multiple creator names across countries', () => {
  const place = {
    name: '츠지한 아카사카점', localName: 'つじ半', city: '도쿄', menu: '해산물 덮밥',
    categoryName: '스시·해산물', keywords: ['Tokyo', '카이센동'],
    country: { name: '일본', keywords: ['Japan'] }, videos: [{ channel: '러브솔' }, { channel: '미미묭mmmyong' }]
  };
  const overseas = { ...place, city: '파리', country: { name: '프랑스', keywords: ['France'] } };
  const results = [place, overseas].filter(entry => matchesQuery(entry, '프랑스 파리 미미묭'));
  assert.deepEqual(results, [overseas]);
  assert.ok(matchesQuery(place, '일본 러브솔 해산물덮밥'));
  assert.ok(matchesQuery(place, 'tokyo つじ半'));
  assert.ok(matchesQuery({ ...place, region: { name: '간토', keywords: ['관동'] } }, '관동 해산물'));
  assert.ok(!matchesQuery(place, '교토'));
});

test('links open the exact named branch and optional video time', () => {
  const map = new URL(mapUrl({ localName: '牛かつもと村 新宿南口店', address: '新宿3-32-2' }));
  assert.equal(map.hostname, 'www.google.com');
  assert.equal(map.searchParams.get('query'), '牛かつもと村 新宿南口店 新宿3-32-2');
  assert.equal(new URL(mapUrl({ coordinates: [34.66, 135.50] })).searchParams.get('query'), '34.66,135.5');
  assert.equal(new URL(videoUrl({ id: '8kd1ng3S3Vw', seconds: 287 })).searchParams.get('t'), '287s');
  assert.equal(timestamp(287), '4:47');
});

test('the public API uses the custom domain and falls back on network and upstream errors', async context => {
  const options = {method: 'POST', body: JSON.stringify({page: 1})};
  const expected = [
    'https://stock.tongapp.co.kr/api/tongfood-catalog',
    'https://korea-futures-cloudflare.pages.dev/api/tongfood-catalog'
  ];
  for (const outcome of ['network', 'upstream']) {
    const calls = [];
    const fetch = context.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push(url);
      assert.equal(init.body, options.body);
      if (calls.length === 2) return Response.json({ok: true});
      if (outcome === 'network') throw new TypeError('Network unavailable');
      return new Response(null, {status: 503});
    });
    const result = await requestFoodApi('tongfood-catalog', options);
    assert.deepEqual(await result.json(), {ok: true});
    assert.deepEqual(calls, expected);
    fetch.mock.restore();
  }
});

test('cancellation and rate limits do not send another API request', async context => {
  const controller = new AbortController();
  const fetch = context.mock.method(globalThis, 'fetch', async () => new Response(null, {status: 429}));
  assert.equal((await requestFoodApi('tongfood-catalog')).status, 429);
  controller.abort();
  await assert.rejects(requestFoodApi('tongfood-catalog', {signal: controller.signal}), {name: 'AbortError'});
  assert.equal(fetch.mock.callCount(), 1);
});

test('a stalled primary connection has a bounded wait before the backup is tried', async context => {
  const fetch = context.mock.method(globalThis, 'fetch', (url, {signal}) => {
    if (url.startsWith('https://stock.tongapp.co.kr/')) {
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {once: true});
      });
    }
    return Promise.resolve(Response.json({ok: true}));
  });
  const response = await requestFoodApi('tongfood-visitors', {method: 'POST'}, 10);
  assert.equal(response.status, 200);
  assert.equal(fetch.mock.callCount(), 2);
});
