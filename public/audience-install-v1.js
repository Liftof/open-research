(function () {
  const config = {"site":"open-research","page":"about","origin":"https://open-research-rho.vercel.app","path":"/about","endpoint":"https://pb-audience.vercel.app/api/collect"};
  if (window !== window.top || location.origin !== config.origin || location.pathname !== config.path) return;

  const params = new URLSearchParams(location.search);
  const key = 'pb-audience-optout';
  const urlOff = params.get('audience') === 'off';
  try {
    if (urlOff) localStorage.setItem(key, '1');
    if (localStorage.getItem(key) === '1') globalThis.pbAudienceDisabled = true;
  } catch {
    globalThis.pbAudienceDisabled = true;
  }
  if (urlOff) globalThis.pbAudienceDisabled = true;

  const privacySignal = navigator.globalPrivacyControl || navigator.doNotTrack === '1' || window.doNotTrack === '1';

  function bindNotice() {
    const notice = document.getElementById('mesure-audience');
    const link = document.getElementById('audience-opt-out');
    const status = document.getElementById('audience-status');
    if (!notice || !link || !status) return;

    function renderRefusal() {
      if (globalThis.pbAudienceDisabled || privacySignal) status.textContent = 'Measurement disabled.';
    }

    if (location.hash === '#mesure-audience') notice.open = true;
    notice.addEventListener('click', event => event.stopPropagation());
    renderRefusal();
    link.addEventListener('click', event => {
      globalThis.pbAudienceDisabled = true;
      try {
        localStorage.setItem(key, '1');
        if (localStorage.getItem(key) === '1') {
          event.preventDefault();
          renderRefusal();
        }
      } catch {
        // The link still opens a page with measurement disabled.
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindNotice, { once: true });
  } else {
    bindNotice();
  }

  if (globalThis.pbAudienceDisabled || privacySignal || params.has('embed')) return;
  const counter = document.createElement('script');
  counter.src = '/audience-v1.js';
  counter.async = true;
  counter.fetchPriority = 'low';
  Object.assign(counter.dataset, {
    site: config.site,
    page: config.page,
    path: config.path,
    endpoint: config.endpoint,
  });
  document.head.appendChild(counter);
})();
