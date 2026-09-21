interface FactSummaryProps {
  text: string;
}

/**
 * Canonical one-paragraph factual summary of what CPdf is. Kept as a
 * dedicated component so the wording stays identical everywhere it is reused
 * (GEO / AI-search optimization).
 */
export function FactSummary({ text }: FactSummaryProps) {
  return (
    <section
      aria-label="CPdf 소개"
      className="rounded-xl border border-brand-100 bg-brand-50 p-6"
    >
      <p className="text-sm leading-relaxed text-slate-700">{text}</p>
    </section>
  );
}
