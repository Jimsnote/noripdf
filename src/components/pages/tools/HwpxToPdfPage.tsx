import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/locales/ko';
import { HwpxToPdfTool } from '@/components/tools/HwpxToPdfTool';
import { ToolPageScaffold } from './ToolPageScaffold';

interface HwpxToPdfPageProps {
  locale: Locale;
  dict: Dictionary;
}

export function HwpxToPdfPage({ locale, dict }: HwpxToPdfPageProps) {
  return (
    <ToolPageScaffold locale={locale} dict={dict} slug="hwpx-to-pdf">
      <HwpxToPdfTool dict={dict} />
    </ToolPageScaffold>
  );
}
