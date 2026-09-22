import type { Metadata, Viewport } from 'next';
import { SITE_NAME } from '@/lib/site';
import { AnalyticsScript } from '@/components/layout/AnalyticsScript';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import '../globals.css';

const SITE_TAGLINE = '개인정보를 지켜주는 무료 PDF 도구';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://noripdf.com',
  ),
  title: {
    default: `${SITE_TAGLINE} | ${SITE_NAME}`,
    template: `%s`,
  },
  description: SITE_TAGLINE,
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
};

/**
 * Root layout of the (ko) route group: every unprefixed, Korean page.
 */
export default function KoRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <AnalyticsScript />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
