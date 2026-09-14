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

  const video = config.video;
  if (!video) return;
  const panel = document.querySelector('#video-panel');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const videoTitle = document.querySelector('[data-video-title]');
  videoTitle.textContent = video.title;
  panel.style.aspectRatio = video.aspectRatio || '16 / 9';
  if (!video.embedUrl) return;

  let url;
  try { url = new URL(video.embedUrl); } catch { return; }
  if (url.protocol !== 'https:' || !['vk.com', 'www.vk.com', 'vkvideo.ru', 'www.vkvideo.ru'].includes(url.hostname) || url.pathname !== '/video_ext.php') return;
  const iframe = document.createElement('iframe');
  iframe.src = url.href;
  iframe.title = video.title;
  iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';
  iframe.allowFullscreen = true;
  panel.append(iframe);
  placeholder.hidden = true;
})();
