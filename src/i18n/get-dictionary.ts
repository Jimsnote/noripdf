import type { Locale } from './config';
import { ko, type Dictionary } from './locales/ko';

const dictionaries: Record<Locale, Dictionary> = { ko };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
