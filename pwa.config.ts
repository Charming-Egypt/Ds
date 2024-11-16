import type { Config } from './types';

export default {
  version: '1.0',
  id: '/',
  name: 'Discover Sharm',
  shortName: 'Discover Sharm',
  description: 'Discover Sharm , your Personal Guide',
  direction: 'auto',
  language: 'en-US',
  backgroundColor: '#212121',
  themeColor: '#212121',
  display: 'standalone',
  orientation: 'any',
  scope: '/',
  startUrl: '/?utm_source=homescreen',
  appleStatusBarStyle: 'black-translucent',
  preferRelatedApplications: true,
  shortcuts: [
    {
      name: 'Activities',
      shortName: 'Activities',
      description: 'Discover Sharm with our Activities',
      url: '/trips',
    },
    {
      name: 'Hotels',
      shortName: 'Hotels',
      description: 'the Top Recommended Hotels from Discover Sharm',
      url: '/hotels',
    },
  ],
  pwa: {
    logs: true,
    // OneSignal is not available if you are not using cloudflare workers
    oneSignalEnabled: false,
    oneSignalConfig: {
      appId: 'ba878a37-3f42-41fe-97f8-b4f18e7b27a1',
      allowLocalhostAsSecureOrigin: true,
    },
  },
  // Please replace with your blog url if you are using CDN (JsDelivr)
  origin: 'https://www.discover-sharm.com/',
} satisfies Config;
