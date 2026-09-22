import type { Compare } from './types';

export const noriPdfVsIlovepdf: Compare = {
  slug: 'noripdf-vs-ilovepdf',
  competitor: 'iLovePDF',
  title: 'NoriPDF vs iLovePDF: 개인정보·제한·가격 비교 | NoriPDF',
  description:
    'iLovePDF는 파일을 서버에 업로드하고 무료 요금제를 제한합니다. NoriPDF는 브라우저 안에서 모든 것을 로컬로 처리합니다 — 영원히 무료, 무제한, 가입 없이.',
  verdict:
    'iLovePDF는 온라인 PDF 도구 중 가장 유명하며, 문서를 서버에 업로드하는 방식으로 작동합니다. 무료 요금제는 한 번에 처리할 수 있는 양을 제한하고 프리미엄은 월 약 $4부터 시작합니다. NoriPDF는 PDF 병합, PDF 분할, PDF 압축, PDF 보호 같은 핵심 작업을 모두 브라우저 안에서 처리합니다. 파일은 기기를 떠나지 않으며, 계정도 없고 작업 제한도 없고 워터마크도 없습니다. 코드는 오픈 소스(AGPL-3.0)라 개인정보 보호 주장을 직접 검증할 수 있습니다.',
  rows: [
    {
      feature: '파일 처리 위치',
      noriPdf: '내 기기에서 처리 (브라우저 내 WebAssembly)',
      them: 'iLovePDF 서버로 업로드',
    },
    {
      feature: '계정 필요 여부',
      noriPdf: '필요 없음',
      them: '기본 사용은 불필요하지만 제한 관리에는 필요',
    },
    {
      feature: '작업 및 파일 제한',
      noriPdf: '작업 제한 없음 (기기 메모리가 파일 크기의 한계)',
      them: '무료 요금제는 작업당 일괄 처리 크기와 파일 수를 제한',
    },
    {
      feature: '가격',
      noriPdf: '무료, 눈에 띄지 않는 광고로 운영',
      them: '무료 요금제 + 프리미엄 월 약 $4부터',
    },
    {
      feature: '오프라인 작동',
      noriPdf: '가능 — 페이지 로딩 후에도 계속 작동',
      them: '불가 — 업로드에는 연결이 필요',
    },
    {
      feature: '개인정보 처리 방식',
      noriPdf: '파일은 기기를 떠나지 않습니다; 오픈 소스(AGPL-3.0)',
      them: '서버에서 2시간 이내 삭제(정책 기준)',
    },
    {
      feature: '도구 수',
      noriPdf: '17개 도구, Office를 Markdown으로 변환 포함',
      them: '30개 이상 도구, PDF를 Word로, 전자서명, OCR 포함',
    },
  ],
  factChecked: '2026년 7월 21일에 사실 확인',
  sources: [
    { label: 'iLovePDF 프리미엄 가격', url: 'https://www.ilovepdf.com/premium' },
    { label: 'iLovePDF 홈페이지', url: 'https://www.ilovepdf.com/' },
  ],
  theirStrengths: [
    '전반적으로 더 많은 도구: 레이아웃을 재구성하는 PDF를 Word로 변환, 스캔 문서용 OCR, 전자서명 — NoriPDF에는 아직 없는 기능입니다.',
    '모바일 앱과 서버 측 자동화용 개발자 API.',
    '서버 처리에는 브라우저 메모리 한도가 없어 아주 크거나 아주 많은 파일도 비교적 문제없이 처리할 수 있습니다.',
  ],
  faqs: [
    {
      q: 'iLovePDF는 기밀 문서에 안전한가요?',
      a: 'iLovePDF는 업로드된 파일을 서버에서 2시간 이내에 삭제하고 분석하지 않는다고 밝히고 있습니다. 많은 분이 이에 안심하고 사용하지만, 문서가 여전히 다른 사람의 인프라를 거치기는 합니다. NoriPDF는 이 문제 자체를 없앱니다. 처리가 내 기기에서 이루어지므로 애초에 전송되는 것이 없습니다.',
    },
    {
      q: 'iLovePDF는 프리미엄을 유료로 판매하는데 NoriPDF는 왜 무료인가요?',
      a: '로컬 처리는 작업당 비용이 들지 않습니다. 처리는 내 기기가 하기 때문입니다. 그래서 온라인 도구들이 제한을 유료 벽 뒤에 두는 주된 이유가 사라집니다. NoriPDF는 구독 대신 눈에 띄지 않는 광고로 운영됩니다.',
    },
    {
      q: '어떤 경우에 iLovePDF를 선택해야 하나요?',
      a: 'PDF를 Word로 변환, 스캔 문서 OCR, 전자서명, API 기반 서버 측 자동화, 또는 브라우저 메모리로 처리하기엔 너무 큰 파일(약 100MB 이상)이 필요하다면 iLovePDF가 현재로서는 더 완성도 높은 선택입니다.',
    },
  ],
};
