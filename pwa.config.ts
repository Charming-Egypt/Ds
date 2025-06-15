import type { Config } from './types';

export default {
  version: '1.0',
  id: '/',
  name: 'Discover Sharm',
  shortName: 'Discover Sharm',
  description: 'Discover Your Next Adventure!',
  direction: 'auto',
  language: 'en-US',
  backgroundColor: '#1E1E1E',
  themeColor: '#1E1E1E',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  startUrl: '/',
  appleStatusBarStyle: 'black-translucent',
  preferRelatedApplications: true,
  shortcuts: [
    {
      name: 'Activities',
      shortName: 'Activities',
      description: 'Discover your Amazon Next Adventure ',
      url: '/p/trips',
    },
    {
      name: 'Hotels',
      shortName: 'Hotels',
      description: 'Discover your Name Amazing Stay',
      url: '/p/hotels',
    },
  ],
  pwa: {
    logs: true,
    // OneSignal is not available if you are not using cloudflare workers
    oneSignalEnabled: true,
    oneSignalConfig: {
      appId: 'ba878a37-3f42-41fe-97f8-b4f18e7b27a1',
      allowLocalhostAsSecureOrigin: true,
    },
  },
  // Please replace with your blog url if you are using CDN (JsDelivr)
  origin: 'https://www.discover-sharm.com/',
} satisfies Config;
