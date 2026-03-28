/* ============================================
   Service Worker — 离线缓存
   让应用在无网络时也能正常使用
   ============================================ */

const CACHE_NAME = 'highlight-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/editor.css',
  '/js/utils.js',
  '/js/store.js',
  '/js/record.js',
  '/js/media.js',
  '/js/router.js',
  '/js/timeline.js',
  '/js/editor.js',
  '/js/app.js',
  '/js/settings.js',
  '/js/cloud/providers/CloudProvider.js',
  '/js/cloud/providers/WebDAVProvider.js',
  '/js/cloud/auth/AuthService.js',
  '/js/cloud/sharing/InvitationService.js',
  '/js/cloud/sync/SyncManager.js',
  '/js/user/UserService.js',
  '/js/user/register.js',
  '/js/user/login.js',
  '/manifest.json'
];

// 安装：预缓存所有静态文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清除旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 拦截请求：优先使用缓存，缓存没有才去网络取
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
