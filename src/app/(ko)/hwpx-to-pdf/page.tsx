import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/get-dictionary';
import { pageMetadata } from '@/lib/seo';
import { SiteShell } from '@/components/layout/SiteShell';
import { HwpxToPdfPage } from '@/components/pages/tools/HwpxToPdfPage';

const locale = 'ko' as const;

export function generateMetadata(): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    '/hwpx-to-pdf',
    dict.toolPages['hwpx-to-pdf'].metaTitle,
    dict.toolPages['hwpx-to-pdf'].metaDescription,
  );
}

export default function Page() {
  const dict = getDictionary(locale);
  return (
    <SiteShell locale={locale} dict={dict}>
      <HwpxToPdfPage locale={locale} dict={dict} />
    </SiteShell>
  );
}
