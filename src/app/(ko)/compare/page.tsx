import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/get-dictionary';
import { pageMetadata } from '@/lib/seo';
import { SiteShell } from '@/components/layout/SiteShell';
import { CompareIndexPage } from '@/components/pages/compare/CompareIndexPage';

const locale = 'ko' as const;

export function generateMetadata(): Metadata {
  const dict = getDictionary(locale);
  void dict;
  return pageMetadata(
    locale,
    '/compare',
    'CPdf vs iLovePDF, Smallpdf, Sejda — 정직한 비교 | CPdf',
    '사실 확인된 비교: 100% 로컬 처리, 영원히 무료, 무제한인 CPdf가 iLovePDF, Smallpdf, Sejda와 어떻게 다른지 — 상대가 진짜로 나은 부분까지 포함합니다.',
  );
}

export default function Page() {
  const dict = getDictionary(locale);
  return (
    <SiteShell locale={locale} dict={dict}>
      <CompareIndexPage />
    </SiteShell>
  );
}
