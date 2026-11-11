const key = 'tongdorak:fx:krw:v1';
let rows = [];
let failed = false;
try { rows = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(rows)) rows = []; } catch { rows = []; }
export function conversion(amount, currency, data = rows) {
  if (!Number.isFinite(amount) || amount <= 0 || currency === 'KRW') return null;
  const row = data.find(r => r.base === 'KRW' && r.quote === currency && Number.isFinite(r.rate) && r.rate > 0);
  if (!row) return null;
  const value = amount / row.rate;
  if (!Number.isFinite(value)) return null;
  return {value, date:row.date, stale:failed || Date.parse(row.date) < Date.now() - 4 * 86400000};
}
function update(element) {
  const result = conversion(Number(element.dataset.amount), element.dataset.currency);
  element.textContent = result ? `약 ${(Math.round(result.value / 100) * 100).toLocaleString('ko-KR')}원 · ${result.date} 환율${result.stale ? ' (이전 환율)' : ''}` : '원화 환산 정보 없음';
  element.title = 'Frankfurter 제공 참고 환율입니다. 결제·환전 수수료는 포함하지 않습니다.';
}
export function attachWon(parent, place) {
  if (!Number.isFinite(place.price?.amount) || place.price.amount <= 0 || place.country.currency === 'KRW') return;
  const line = document.createElement('small');
  line.className = 'won-price'; line.dataset.amount = place.price.amount; line.dataset.currency = place.country.currency;
  update(line); parent.append(line);
}
export async function refreshRates() {
  try {
    const response = await fetch('https://api.frankfurter.dev/v2/rates?base=KRW',{signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('rates');
    const next = await response.json();
    if (!Array.isArray(next) || !next.length || !next.every(r=>r.base==='KRW' && Number.isFinite(r.rate) && r.rate>0 && /^\d{4}-\d{2}-\d{2}$/.test(r.date))) throw Error('rates');
    rows = next; failed = false;
    try { localStorage.setItem(key,JSON.stringify(rows)); } catch {}
  } catch { failed = true; }
  document.querySelectorAll('.won-price').forEach(update);
}
