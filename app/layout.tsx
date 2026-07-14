import './globals.css';
import type {Metadata} from 'next';

const faviconVersion = '20260714';

export const metadata: Metadata = {
  title: 'SolarFX RAMS Generator',
  description: 'Site-specific RAMS generator',
  manifest: `/site.webmanifest?v=${faviconVersion}`,
  icons: {
    icon: [
      {url: `/favicon.ico?v=${faviconVersion}`, sizes: 'any'},
      {url: `/favicon-16x16.png?v=${faviconVersion}`, sizes: '16x16', type: 'image/png'},
      {url: `/favicon-32x32.png?v=${faviconVersion}`, sizes: '32x32', type: 'image/png'},
      {url: `/android-chrome-192x192.png?v=${faviconVersion}`, sizes: '192x192', type: 'image/png'},
      {url: `/android-chrome-512x512.png?v=${faviconVersion}`, sizes: '512x512', type: 'image/png'}
    ],
    shortcut: [`/favicon.ico?v=${faviconVersion}`],
    apple: [
      {url: `/apple-touch-icon.png?v=${faviconVersion}`, sizes: '180x180', type: 'image/png'}
    ]
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
