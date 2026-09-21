import type { Compare } from './types';
import { coolpdfVsIlovepdf } from './coolpdf-vs-ilovepdf';
import { coolpdfVsSejda } from './coolpdf-vs-sejda';
import { coolpdfVsSmallpdf } from './coolpdf-vs-smallpdf';

/**
 * Central registry for /compare/ pages (Korean-only). Adding a page here is
 * enough to publish it: the compare routes and sitemap derive from this list.
 */
export const compares: Compare[] = [coolpdfVsIlovepdf, coolpdfVsSmallpdf, coolpdfVsSejda];

/** Looks up a comparison page by its URL slug. */
export function getCompare(slug: string): Compare | undefined {
  return compares.find((compare) => compare.slug === slug);
}
