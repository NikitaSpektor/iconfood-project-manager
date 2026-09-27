const EVENT = 'iconfood:update-ready';

let waiting: ServiceWorker | null = null;

export function onUpdateReady(handler: () => void) {
  window.addEventListener(EVENT, handler);
  if (waiting) handler();
  return () => window.removeEventListener(EVENT, handler);
}

export function markUpdateReady(worker: ServiceWorker) {
  waiting = worker;
  window.dispatchEvent(new Event(EVENT));
}

export function applyUpdate() {
  if (!waiting) {
    window.location.reload();
    return;
  }
  waiting.postMessage('skip-waiting');
}

export function registerUpdates() {
  if (!('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) markUpdateReady(reg.waiting);

        reg.update();
        setInterval(() => reg.update(), 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              markUpdateReady(next);
            }
          });
        });
      })
      .catch(() => undefined);
  });
}
