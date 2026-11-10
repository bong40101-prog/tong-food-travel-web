import { requestFoodApi } from './food-api.mjs';
const dialog = document.getElementById('feedback-dialog');
const form = document.getElementById('feedback-form');
const open = document.getElementById('feedback-open');
const status = document.getElementById('feedback-status');
const send = document.getElementById('feedback-send');
let sending = false;
let receipt = null;
let lastPayload = '';
let requestId = '';

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('feedback-error', error);
}

function selectedLocation() {
  const country = document.querySelector('#countries button[aria-pressed="true"]');
  const region = document.getElementById('region');
  return {
    country: country?.textContent ?? '',
    region: region.value ? region.selectedOptions[0]?.text : '',
    city: document.getElementById('city').value
  };
}

open.addEventListener('click', () => {
  if (receipt) {
    form.reset();
    receipt = null;
    lastPayload = '';
    requestId = '';
    setStatus('');
    send.disabled = false;
    send.textContent = '비공개로 제출';
  }
  dialog.showModal();
});
document.getElementById('feedback-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => open.focus());

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || receipt || !form.reportValidity()) return;
  const value = name => form.elements.namedItem(name).value.trim();
  const payload = {
    kind: value('kind'), title: value('title'), message: value('message'),
    contact: value('contact'), website: value('website'), context: selectedLocation()
  };
  const serial = JSON.stringify(payload);
  if (serial !== lastPayload) {
    lastPayload = serial;
    requestId = crypto.randomUUID();
  }

  sending = true;
  send.disabled = true;
  send.textContent = '접수 중…';
  setStatus('');
  const failure = '접수하지 못했습니다. 작성 내용은 유지됩니다. 다시 시도해 주세요.';
  try {
    const response = await requestFoodApi('tongfood-feedback', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...payload, id: requestId}),
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    }, 10000);
    if (!response.ok) throw new Error(response.status === 429 ? '잠시 후 다시 제출해 주세요.' : failure);
    const result = await response.json();
    if (!result.ok || result.id !== requestId) throw new Error(failure);
    receipt = result.id;
    setStatus('접수되었습니다. 운영자만 확인할 수 있습니다. 접수번호 ' + receipt.slice(0, 8));
    send.textContent = '접수 완료';
  } catch (error) {
    const retry = error.name === 'TimeoutError'
      ? '연결 시간이 초과되었습니다. 같은 내용으로 다시 시도해 주세요.'
      : error.message === '잠시 후 다시 제출해 주세요.' ? error.message : failure;
    setStatus(retry, true);
    send.textContent = '비공개로 제출';
    send.disabled = false;
  } finally {
    sending = false;
  }
});
