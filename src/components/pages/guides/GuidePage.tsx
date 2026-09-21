import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { getGuide } from '@/lib/guides';
import type { Guide } from '@/lib/guides/types';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { tools } from '@/lib/tools';
import { JsonLd } from '@/components/seo/JsonLd';

interface GuidePageProps {
  guide: Guide;
}

const linkClass =
  'font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800';

/**
 * Renders inline [label](/path/) links inside guide copy. Anything that is
 * not a well-formed, site-relative link passes through as plain text.
 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!match || !match[2].startsWith('/')) {
      return <Fragment key={index}>{part}</Fragment>;
    }
    return (
      <Link key={index} href={match[2]} className={linkClass}>
        {match[1]}
      </Link>
    );
  });
}

/**
 * Turns a Guide data object into a full tutorial page: breadcrumb, intro,
 * tool CTA, quick steps, walkthrough sections, alternatives, edge cases, FAQ
 * accordion, related guides, and a closing tool CTA. Emits Article, HowTo and
 * FAQPage JSON-LD built from the same data as the visible content.
 */
export function GuidePage({ guide }: GuidePageProps) {
  const tool = guide.toolSlug ? tools.find((t) => t.slug === guide.toolSlug) : undefined;
  const toolName = tool ? getDictionary('ko').tools[tool.i18nKey].name : null;
  const url = `${SITE_URL}/guides/${guide.slug}/`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };

  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.title,
    step: guide.quickSteps.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text,
    })),
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  // Related guides that are not written yet are silently skipped.
  const relatedGuides = guide.related
    .map((slug) => getGuide(slug))
    .filter((related): related is Guide => Boolean(related && related.slug !== guide.slug));

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={articleLd} />
      <JsonLd data={howToLd} />
      <JsonLd data={faqLd} />

      <nav aria-label="브레드크럼" className="text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-700">
              홈
            </Link>
          </li>
          <li aria-hidden className="text-slate-300">
            /
          </li>
          <li>
            <Link href="/guides/" className="hover:text-brand-700">
              가이드
            </Link>
          </li>
          <li aria-hidden className="text-slate-300">
            /
          </li>
          <li className="text-slate-700">{guide.title}</li>
        </ol>
      </nav>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {guide.title}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-slate-700">{renderInline(guide.intro)}</p>

      {tool && toolName ? (
        <div className="mt-8 rounded-xl border border-brand-100 bg-brand-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            무료 온라인 도구
          </p>
          <p className="mt-2 leading-relaxed text-slate-700">
            설명을 건너뛰고 도구로 바로 이동하세요 — 가입 없이, 업로드 없이.
          </p>
          <Link
            href={`/${tool.slug}/`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            무료 {toolName} 도구 열기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">간단 요약</h2>
        <ol className="mt-6 list-decimal space-y-3 pl-6 text-slate-700">
          {guide.quickSteps.map((step, index) => (
            <li key={index} className="leading-relaxed">
              {renderInline(step)}
            </li>
          ))}
        </ol>
      </section>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index} className="mt-4 leading-relaxed text-slate-700">
              {renderInline(paragraph)}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
              {section.bullets.map((bullet, index) => (
                <li key={index} className="leading-relaxed">
                  {renderInline(bullet)}
                </li>
              ))}
            </ul>
          ) : null}
          {section.image ? (
            // Screenshots are optional assets generated later; a missing file
            // degrades to the alt text and never breaks the build or page.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.image.src}
              alt={section.image.alt}
              loading="lazy"
              className="mt-6 w-full rounded-xl border border-slate-200 bg-slate-50"
            />
          ) : null}
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">다른 방법</h2>
        {guide.alternatives.map((block) => (
          <div key={block.heading} className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900">{block.heading}</h3>
            {block.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-2 leading-relaxed text-slate-700">
                {renderInline(paragraph)}
              </p>
            ))}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">주의 사항</h2>
        {guide.edgeCases.map((block) => (
          <div key={block.heading} className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900">{block.heading}</h3>
            {block.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-2 leading-relaxed text-slate-700">
                {renderInline(paragraph)}
              </p>
            ))}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          자주 묻는 질문
        </h2>
        <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {guide.faqs.map((faq) => (
            <details key={faq.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 leading-relaxed text-slate-700">{renderInline(faq.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {relatedGuides.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            관련 가이드 및 도구
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {relatedGuides.map((related) => {
              const relatedTool = related.toolSlug
                ? tools.find((t) => t.slug === related.toolSlug)
                : undefined;
              return (
                <div
                  key={related.slug}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <Link
                    href={`/guides/${related.slug}/`}
                    className="font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {related.title}
                  </Link>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {related.description}
                  </p>
                  {relatedTool ? (
                    <Link
                      href={`/${relatedTool.slug}/`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden />
                      도구 열기
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tool && toolName ? (
        <div className="mt-16 rounded-xl bg-brand-600 p-8 text-center">
          <h2 className="text-xl font-bold text-white">직접 사용해 보실 준비가 되셨나요?</h2>
          <p className="mt-2 text-brand-100">
            {toolName} 도구를 열어 이 가이드를 바로 실습해 보세요 — 무료이며 가입 없이 이용할 수
            있습니다.
          </p>
          <Link
            href={`/${tool.slug}/`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50"
          >
            {toolName} 도구 열기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
