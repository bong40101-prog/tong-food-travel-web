import { requestFoodApi } from './food-api.mjs';
const label = document.getElementById('daily-visitors');
const koreanDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
});
let recordedDate;
let inFlight;
let resetTimer;
let retried = false;

async function recordVisit() {
  try {
    const response = await requestFoodApi('tongfood-visitors', {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    }, 8000);
    if (!response.ok) throw new Error('Counter unavailable');

    const data = await response.json();
    const delay = Date.parse(data.nextResetAt) - Date.parse(data.serverNow) + 1000;
    if (data.method !== 'daily_unique_ip' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
      || !Number.isSafeInteger(data.dailyVisitors) || data.dailyVisitors < 1
      || !Number.isFinite(delay) || delay < 1000 || delay > 86402000) {
      throw new Error('Invalid counter data');
    }

    retried = false;
    recordedDate = data.date;
    label.textContent = `오늘 방문자 ${data.dailyVisitors.toLocaleString('ko-KR')}명`;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(refresh, delay);
  } catch {
    label.textContent = '오늘 방문자 집계 불가';
    if (!retried) {
      retried = true;
      setTimeout(refresh, 5000);
    }
  }
}

function refresh() {
  if (!inFlight) {
    inFlight = recordVisit().finally(() => {
      inFlight = null;
    });
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && recordedDate !== koreanDate.format(new Date())) refresh();
});
refresh();
