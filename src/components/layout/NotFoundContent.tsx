import Link from 'next/link';

/** Shared 404 content for the not-found page and the app-wide 404 document. */
export function NotFoundContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-slate-600">
        요청하신 페이지가 존재하지 않습니다.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        NoriPDF 홈으로 돌아가기
      </Link>
    </div>
  );
}
