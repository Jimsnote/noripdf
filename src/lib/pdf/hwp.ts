import { hwpToHwpx, HwpEncryptedError, HwpUnsupportedError, HwpInvalidFormatError } from '@ssabrojs/hwpxjs';
import { parseAndRender, hwpxErrorKey, HwpxError, type HwpxProgress, type HwpxToPdfResult } from './hwpx';

/**
 * HWP (한글 2002+, binary HWP 5.0) → PDF. The binary container is converted
 * to HWPX in the browser by @ssabrojs/hwpxjs (MIT), then the HWPX pipeline
 * parses and renders it. Encrypted files, distribution-format (ViewText)
 * documents and pre-5.0 (HWP 3.x) files are rejected with dedicated errors.
 * This module is dynamically imported by the tool component so the HWP
 * parser stays out of the HWPX-only page bundle.
 */

export type HwpErrorKey = 'encrypted' | 'unsupported' | 'invalid' | 'empty' | 'engine';

export function hwpErrorKey(err: unknown): HwpErrorKey {
  if (err instanceof HwpEncryptedError) return 'encrypted';
  if (err instanceof HwpUnsupportedError) return 'unsupported';
  if (err instanceof HwpInvalidFormatError) return 'invalid';
  if (err instanceof HwpxError) return hwpxErrorKey(err);
  if (err instanceof Error && /decrypt|password|암호/i.test(err.message)) return 'encrypted';
  return 'invalid';
}

export async function hwpToPdf(
  bytes: Uint8Array,
  onProgress?: (p: HwpxProgress) => void,
): Promise<HwpxToPdfResult> {
  onProgress?.({ stage: 'parse', ratio: 0, engineStatus: 'convert' });
  const hwpxBytes = await hwpToHwpx(bytes);
  return parseAndRender(new Uint8Array(hwpxBytes), onProgress);
}
