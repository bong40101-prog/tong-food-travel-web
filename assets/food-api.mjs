import {catalogAuthorization} from './account-store.mjs';
const primaryApi = 'https://stock.tongapp.co.kr/api/';
const fallbackApi = 'https://korea-futures-cloudflare.pages.dev/api/';

export async function requestFoodApi(route, {signal, ...options} = {}, timeoutMs = 6000) {
  async function attempt(base) {
    const controller = new AbortController();
    const cancel = () => controller.abort(signal.reason);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, {once: true});
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    try {
      if (controller.signal.aborted) throw controller.signal.reason;
      const headers = new Headers(options.headers);
      if (route === 'tongfood-catalog') {
        for (const [key, value] of Object.entries(catalogAuthorization())) headers.set(key, value);
      }
      return await fetch(base + route, {...options, headers, signal: controller.signal});
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }

  try {
    const primary = await attempt(primaryApi);
    // Preserve validation responses and rate limits from the shared backend.
    if (primary.status < 500) return primary;
    primary.body?.cancel().catch(() => {});
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  return attempt(fallbackApi);
}
