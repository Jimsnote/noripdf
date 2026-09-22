import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/get-dictionary';
import { pageMetadata } from '@/lib/seo';
import { SiteShell } from '@/components/layout/SiteShell';
import { HwpToPdfPage } from '@/components/pages/tools/HwpToPdfPage';

const locale = 'ko' as const;

export function generateMetadata(): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    '/hwp-to-pdf',
    dict.toolPages['hwp-to-pdf'].metaTitle,
    dict.toolPages['hwp-to-pdf'].metaDescription,
  );
}

export default function Page() {
  const dict = getDictionary(locale);
  return (
    <SiteShell locale={locale} dict={dict}>
      <HwpToPdfPage locale={locale} dict={dict} />
    </SiteShell>
  );
}
