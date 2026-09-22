import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ExternalLink, Scale } from 'lucide-react';
import type { Compare } from '@/lib/compare/types';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { JsonLd } from '@/components/seo/JsonLd';

interface ComparePageProps {
  compare: Compare;
}

/**
 * Renders a /compare/ page: breadcrumb, H1, honest verdict, feature
 * comparison table (NoriPDF column highlighted), the competitor's genuine
 * strengths, fact-check line with sources, FAQ accordion, and a closing CTA.
 * Emits Article and FAQPage JSON-LD from the same data as the visible content.
 */
export function ComparePage({ compare }: ComparePageProps) {
  const url = `${SITE_URL}/compare/${compare.slug}/`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: compare.title,
    description: compare.description,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: compare.faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <article className="mx-auto max-w-3xl">
      <JsonLd data={articleLd} />
      <JsonLd data={faqLd} />

      <nav aria-label="이동 경로" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/compare/" className="hover:text-brand-700">비교</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{compare.competitor}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {compare.title.replace(/ \| NoriPDF$/, '')}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-700">{compare.verdict}</p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-500" scope="col">
                <span className="sr-only">기능</span>
              </th>
              <th className="bg-brand-50 px-4 py-3 font-bold text-brand-700" scope="col">
                NoriPDF
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700" scope="col">
                {compare.competitor}
              </th>
            </tr>
          </thead>
          <tbody>
            {compare.rows.map((row) => (
              <tr key={row.feature} className="border-t border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600" scope="row">
                  {row.feature}
                </th>
                <td className="bg-brand-50/60 px-4 py-3 text-slate-800">{row.noriPdf}</td>
                <td className="px-4 py-3 text-slate-600">{row.them}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Scale className="h-5 w-5 text-brand-600" aria-hidden />
          {compare.competitor}이(가) 실제로 더 나은 부분
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          {compare.theirStrengths.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        {compare.factChecked}. 출처:{' '}
        {compare.sources.map((source, index) => (
          <span key={source.url}>
            {index > 0 ? ', ' : ''}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
            >
              {source.label}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </span>
        ))}
        . 경쟁 서비스의 기능과 가격은 이후 변경되었을 수 있으니 최신 정보는 해당 사이트에서 확인하세요.
      </p>

      <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-lg font-semibold text-slate-900">
          직접 차이를 체험해 보세요 — 무료, 가입 없이, 업로드 없이.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          NoriPDF 도구 열기 <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          자주 묻는 질문
        </h2>
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {compare.faqs.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
