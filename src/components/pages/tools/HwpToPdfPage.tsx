import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/locales/ko';
import { HwpxToPdfTool } from '@/components/tools/HwpxToPdfTool';
import { ToolPageScaffold } from './ToolPageScaffold';

interface HwpToPdfPageProps {
  locale: Locale;
  dict: Dictionary;
}

export function HwpToPdfPage({ locale, dict }: HwpToPdfPageProps) {
  return (
    <ToolPageScaffold locale={locale} dict={dict} slug="hwp-to-pdf">
      <HwpxToPdfTool dict={dict} slug="hwp-to-pdf" />
    </ToolPageScaffold>
  );
}
