'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import type { Dictionary } from '@/i18n/locales/ko';
import { hwpxToPdf, hwpxErrorKey } from '@/lib/pdf/hwpx';
import { FileDropzone } from './FileDropzone';
import { ToolShell } from './ToolShell';
import { DownloadCard, formatBytes } from './DownloadCard';
import { pdfBlob } from './blob';

interface HwpxToPdfToolProps {
  dict: Dictionary;
}

interface Result {
  name: string;
  size: number;
  url: string;
}

interface Progress {
  stage: 'engine' | 'parse' | 'render';
  ratio: number;
  pages?: number;
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024;
const MOBILE_MAX_BYTES = 50 * 1024 * 1024;

/**
 * HWPX(한글 2024+) → PDF. Pure in-browser pipeline: OPC zip parse, a small
 * layout engine, pdf-lib output with the embedded Nanum Gothic (OFL).
 * First use downloads the Korean font (~4 MB) with progress, then caches it.
 */
export function HwpxToPdfTool({ dict }: HwpxToPdfToolProps) {
  const ui = dict.toolUi;
  const copy = dict.toolPages['hwpx-to-pdf'];
  const [file, setFile] = useState<File | null>(null);
  const [maxSizeBytes, setMaxSizeBytes] = useState(MAX_SIZE_BYTES);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      setMaxSizeBytes(MOBILE_MAX_BYTES);
    }
  }, []);

  useEffect(() => {
    if (!result) return undefined;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  async function process() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { pdfBytes } = await hwpxToPdf(bytes, (p) => {
        if (p.stage === 'engine') {
          setProgress({ stage: 'engine', ratio: p.ratio });
        } else if (p.stage === 'parse') {
          setProgress({ stage: 'parse', ratio: 0 });
        } else {
          setProgress({ stage: 'render', ratio: 0, pages: p.pages ?? 0 });
        }
      });
      const blob = pdfBlob(pdfBytes);
      setResult({ name: 'converted.pdf', size: blob.size, url: URL.createObjectURL(blob) });
    } catch (err) {
      const key = hwpxErrorKey(err);
      setError(
        key === 'encrypted' ? copy.errorEncrypted : key === 'empty' ? copy.errorEmpty : copy.errorInvalid,
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const statusText = progress
    ? progress.stage === 'engine'
      ? copy.statusFonts.replace('{percent}', String(Math.round(progress.ratio * 100)))
      : progress.stage === 'parse'
        ? copy.statusParse
        : progress.pages
          ? copy.statusRenderDone.replace('{pages}', String(progress.pages))
          : copy.statusRender
    : null;

  return (
    <ToolShell
      title={copy.heading}
      intro={copy.intro}
      chips={ui.trustChips}
      privacyNote={ui.privacyNote}
      upload={
        <>
          <FileDropzone
            accept="hwpx"
            multiple={false}
            maxFiles={1}
            currentCount={file ? 1 : 0}
            maxSizeBytes={maxSizeBytes}
            disabled={busy}
            onFiles={(files) => {
              setError(null);
              setResult(null);
              setFile(files[0] ?? null);
            }}
            dict={dict}
          />
          {file ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={busy}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label={`${ui.remove}: ${file.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </>
      }
      action={
        <button
          type="button"
          onClick={process}
          disabled={!file || busy}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
          {busy ? ui.processing : copy.button}
        </button>
      }
      status={
        <>
          {statusText && busy ? (
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <p className="text-sm text-brand-900">{statusText}</p>
              {progress?.stage === 'engine' ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </>
      }
      result={
        result ? (
          <DownloadCard
            fileName={result.name}
            sizeBytes={result.size}
            url={result.url}
            title={ui.readyTitle}
            downloadLabel={ui.download}
          />
        ) : undefined
      }
    />
  );
}
