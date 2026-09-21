import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';
import { AnalyticsScript } from '@/components/layout/AnalyticsScript';
import { NotFoundContent } from '@/components/layout/NotFoundContent';
import './globals.css';

export const metadata: Metadata = {
  title: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

/**
 * App-wide 404 document for URLs matching no route at all (enabled via
 * `experimental.globalNotFound`). The site is Korean-only, so the 404
 * document is Korean too.
 */
export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body>
        <NotFoundContent />
        <AnalyticsScript />
      </body>
    </html>
  );
}
