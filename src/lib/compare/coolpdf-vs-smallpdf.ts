import type { Compare } from './types';

export const coolpdfVsSmallpdf: Compare = {
  slug: 'coolpdf-vs-smallpdf',
  competitor: 'Smallpdf',
  title: 'CPdf vs Smallpdf: 무료 사용 제한 비교 | CPdf',
  description:
    'Smallpdf는 무료 사용을 하루 2회로 제한하고 파일을 업로드합니다. CPdf는 일일 제한이 없고 브라우저 안에서 모든 것을 로컬로 처리합니다 — 무료, 가입 없이.',
  verdict:
    'Smallpdf는 다듬어진 인기 PDF 도구지만, 무료 요금제는 하루 2회만 허용하고 문서를 서버에 업로드해야 합니다. Pro는 월 약 $12부터 시작합니다. CPdf는 일일 작업 제한이 전혀 없고 계정도 요구하지 않습니다. 모든 도구가 브라우저 안에서 로컬로 작동하기 때문입니다. 자주, 매일 해야 하는 PDF 작업이라면 CPdf가 제한도 적고 더 개인정보 친화적인 선택입니다.',
  rows: [
    {
      feature: '파일 처리 위치',
      coolpdf: '내 기기에서 처리 (브라우저 내 WebAssembly)',
      them: 'Smallpdf 서버로 업로드',
    },
    {
      feature: '일일 작업 제한',
      coolpdf: '없음',
      them: '무료 요금제는 하루 2회',
    },
    {
      feature: '가격',
      coolpdf: '무료, 눈에 띄지 않는 광고로 운영',
      them: '무료 요금제 + Pro 월 약 $12부터',
    },
    {
      feature: '계정 필요 여부',
      coolpdf: '필요 없음',
      them: '일일 무료 사용량 추적에 필요',
    },
    {
      feature: '오프라인 작동',
      coolpdf: '가능 — 페이지 로딩 후에도 계속 작동',
      them: '불가 — 업로드에는 연결이 필요',
    },
    {
      feature: '개인정보 처리 방식',
      coolpdf: '파일은 기기를 떠나지 않습니다; 오픈 소스(AGPL-3.0)',
      them: '짧은 보관 기간 후 삭제(정책 기준)',
    },
    {
      feature: '눈에 띄는 부가 기능',
      coolpdf: '페이지를 시각적으로 정리, Office를 Markdown으로, 오픈 소스 코드',
      them: '전자서명, AI 문서 요약, 데스크톱 및 모바일 앱',
    },
  ],
  factChecked: '2026년 7월 21일에 사실 확인',
  sources: [
    { label: 'Smallpdf Pro 가격', url: 'https://smallpdf.com/pro' },
    { label: 'Smallpdf 홈페이지', url: 'https://smallpdf.com/' },
  ],
  theirStrengths: [
    '안내식 서명 흐름을 갖춘 전자서명 — CPdf에는 없는 기능입니다.',
    '문서 요약, PDF와 대화 같은 AI 기능.',
    '오프라인과 이동 중 사용을 위한 네이티브 데스크톱 및 모바일 앱.',
  ],
  faqs: [
    {
      q: '하루 2회 제한이 사실인가요?',
      a: '맞습니다. Smallpdf 가격 페이지에는 무료 요금제가 하루 2개 문서로 제한된다고 명시되어 있습니다. 한도에 도달하면 다음 날까지 기다리거나 Pro로 업그레이드해야 합니다. CPdf에는 그런 제한이 없습니다. 작업이 대여한 서버가 아니라 내 기기에서 이루어지므로 원하는 만큼 몇 번이든 사용할 수 있습니다.',
    },
    {
      q: '민감한 파일에는 어느 쪽이 더 좋나요?',
      a: 'Smallpdf는 파일이 TLS로 전송되고 짧은 보관 기간 후 삭제된다고 밝히고 있습니다. 많은 문서에는 합리적인 수준이지만, 계약서, 의료 기록, 재무 제표라면 가장 안전한 방법은 아무 곳에도 보내지 않는 것이며, CPdf가 정확히 그렇게 작동합니다.',
    },
    {
      q: '어떤 경우에 Smallpdf를 유료로 쓸 가치가 있나요?',
      a: '전자서명, AI 요약, 오프라인 워크플로가 가능한 네이티브 앱을 정기적으로 필요로 한다면 Smallpdf Pro는 합리적인 가격입니다. 작업이 대부분 PDF 병합, 분할, 압축, 변환, 보호라면 CPdf가 무료로, 제한 없이 커버합니다.',
    },
  ],
};
