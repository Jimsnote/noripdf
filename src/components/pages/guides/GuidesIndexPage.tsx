import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { guides } from '@/lib/guides';
import { tools } from '@/lib/tools';

/**
 * Guides index (/guides/): one card per guide with its title, a one-line
 * summary, and a link to the associated tool. The site is Korean-only.
 */
export function GuidesIndexPage() {
  const dict = getDictionary('ko');

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        PDF 가이드 및 튜토리얼
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
        모든 CPdf 도구를 위한 단계별 튜토리얼 — 무료이며 브라우저에서 바로 동작하고, 사생활 보호를
        전제로 설계되었습니다.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => {
          const tool = guide.toolSlug
            ? tools.find((t) => t.slug === guide.toolSlug)
            : undefined;
          return (
            <div
              key={guide.slug}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-base font-semibold text-slate-900">
                <Link href={`/guides/${guide.slug}/`} className="hover:text-brand-700">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{guide.description}</p>
              {tool ? (
                <Link
                  href={`/${tool.slug}/`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  {dict.tools[tool.i18nKey].name} 도구 열기
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
