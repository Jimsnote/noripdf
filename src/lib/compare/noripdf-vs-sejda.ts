import type { Compare } from './types';

export const noriPdfVsSejda: Compare = {
  slug: 'noripdf-vs-sejda',
  competitor: 'Sejda',
  title: 'NoriPDF vs Sejda: 어떤 무료 PDF 도구가 나을까? | NoriPDF',
  description:
    'Sejda 웹 도구는 시간당 3회까지 무료이며 파일을 업로드합니다. NoriPDF는 시간 제한이 없고 브라우저 안에서 모든 것을 로컬로 처리합니다.',
  verdict:
    'Sejda는 시간당 3회까지 무료로 사용할 수 있는 실용적인 웹 PDF 도구와, 로컬 처리용 유료 데스크톱 앱을 제공합니다. 웹 도구는 처리를 위해 파일을 업로드합니다. NoriPDF는 둘의 중간에 있습니다. 데스크톱 앱처럼 무제한이면서도 설치할 것이 없습니다. 모든 도구가 브라우저 안에서 로컬로 작동하고, 무료이며 계정도 필요 없습니다.',
  rows: [
    {
      feature: '파일 처리 위치',
      noriPdf: '내 기기에서 처리 (브라우저 내 WebAssembly)',
      them: '웹 도구는 업로드; 데스크톱 앱은 로컬 처리(유료)',
    },
    {
      feature: '작업 제한',
      noriPdf: '없음',
      them: '무료 웹 요금제는 시간당 3회',
    },
    {
      feature: '가격',
      noriPdf: '무료, 눈에 띄지 않는 광고로 운영',
      them: '웹 주간 패스 약 $5; 데스크톱 앱 연 약 $63',
    },
    {
      feature: '계정 필요 여부',
      noriPdf: '필요 없음',
      them: '무료 웹 요금제는 불필요; 구매 시 필요',
    },
    {
      feature: '개인정보 처리 방식',
      noriPdf: '파일은 기기를 떠나지 않습니다; 오픈 소스(AGPL-3.0)',
      them: '웹 업로드는 2시간 후 삭제; 데스크톱은 내 기기에만 저장',
    },
    {
      feature: '오프라인 작동',
      noriPdf: '가능 — 페이지 로딩 후',
      them: '웹 도구는 불가; 데스크톱 앱은 가능',
    },
    {
      feature: '주요 도구',
      noriPdf: '페이지를 시각적으로 정리, Office를 Markdown으로, 이미지 추출',
      them: 'PDF 내 텍스트 편집, 양식, Bates 번호 매기기',
    },
  ],
  factChecked: '2026년 7월 21일에 사실 확인',
  sources: [
    { label: 'Sejda 가격', url: 'https://www.sejda.com/pricing' },
    { label: 'Sejda 홈페이지', url: 'https://www.sejda.com/' },
  ],
  theirStrengths: [
    '실제 PDF 내 텍스트 편집 — PDF의 기존 텍스트를 직접 수정하는 기능 — 이는 NoriPDF를 포함한 거의 모든 무료 도구가 시도하지 않는 영역입니다.',
    '법률 업무용 양식 채우기, 양식 평탄화, Bates 번호 매기기.',
    'Sejda의 더 넓은 도구 모음을 로컬 전용 처리로 사용하고 싶은 분을 위한 유료 데스크톱 앱.',
  ],
  faqs: [
    {
      q: 'Sejda 데스크톱 앱도 로컬 처리라던데, 왜 NoriPDF를 쓰나요?',
      a: 'Sejda Desktop은 정당한 로컬 처리 선택지지만 유료이며 기기마다 설치해야 합니다. NoriPDF는 어떤 브라우저에서든 어떤 기기에서든 똑같은 "업로드되지 않음" 보장을 설치 없이 무료로 제공합니다. 회사 노트북이나 공용 컴퓨터에서 특히 편리합니다.',
    },
    {
      q: '시간당 3회 제한은 실제로는 어떤 의미인가요?',
      a: 'Sejda 무료 웹 요금제에서는 시간당 최대 3개 문서를 처리할 수 있고, 더 쓰려면 기다리거나 패스를 구매해야 합니다. NoriPDF에는 시간이나 일 단위 제한이 전혀 없습니다.',
    },
    {
      q: '어떤 경우에 Sejda를 선택해야 하나요?',
      a: 'PDF 안의 기존 텍스트를 편집하거나, 양식을 채우거나 평탄화하거나, Bates 번호를 추가해야 할 때 — 이것이 Sejda의 진짜 강점이며 NoriPDF는 아직 이를 지원하지 않습니다.',
    },
  ],
};
