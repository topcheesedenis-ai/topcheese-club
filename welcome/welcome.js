(() => {
  'use strict';
  const config = window.CLUB_WELCOME;
  if (!config) return;

  document.querySelectorAll('[data-intro]').forEach(element => {
    const value = config.intro[element.dataset.intro];
    if (typeof value === 'string') {
      element.textContent = value;
      element.hidden = !value;
    }
  });
  document.querySelectorAll('[data-link]').forEach(link => {
    const value = config[link.dataset.link];
    if (typeof value === 'string' && value.startsWith('https://')) link.href = value;
  });

  const tabs = [...document.querySelectorAll('[data-device]')];
  const panel = document.querySelector('#video-panel');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const videoTitle = document.querySelector('[data-video-title]');

  function selectDevice(device) {
    const video = config.videos[device];
    if (!video) return;
    tabs.forEach(tab => {
      const selected = tab.dataset.device === device;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `tab-${device}`);
    panel.querySelector('iframe')?.remove(); // Stop the previous video, including its audio.
    videoTitle.textContent = video.title;
    placeholder.hidden = false;
    panel.style.aspectRatio = video.aspectRatio || '16 / 9';
    if (!video.embedUrl) return;

    let url;
    try { url = new URL(video.embedUrl); } catch { return; }
    if (url.protocol !== 'https:' || !['vk.com', 'www.vk.com', 'vkvideo.ru', 'www.vkvideo.ru'].includes(url.hostname) || url.pathname !== '/video_ext.php') return;
    const iframe = document.createElement('iframe');
    iframe.src = url.href;
    iframe.title = video.title;
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    panel.append(iframe);
    placeholder.hidden = true;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-selected') !== 'true') selectDevice(tab.dataset.device);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      if (next !== index) selectDevice(tabs[next].dataset.device);
    });
  });
  selectDevice(window.matchMedia('(max-width: 699px)').matches ? 'mobile' : 'desktop');
})();
