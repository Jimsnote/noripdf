import type { Guide } from './types';

/**
 * 아래 사실들은 components/tools/DocxToMarkdownTool.tsx와
 * 한국어 toolPages 사전 항목과 대조해 확인한 것이므로 — 계속 동기화를 유지할 것.
 */
export const howToConvertDocxToMarkdown: Guide = {
  slug: 'how-to-convert-docx-to-markdown',
  toolSlug: 'docx-to-markdown',
  title: 'Word(DOCX)를 Markdown으로 변환하는 방법 — 무료, 로컬 처리',
  description:
    '단계별 가이드: .docx를 깔끔한 Markdown으로 변환 — 제목, 목록, 표, 굵게/기울임꼴 보존 — 전부 브라우저에서 로컬 처리. 무료, 업로드 없음, 가입 불필요.',
  intro:
    'Word 문서를 Markdown으로 변환하는 가장 쉬운 방법은 브라우저에서 로컬로 처리하는 것입니다. 무료 [DOCX를 Markdown으로 도구](/docx-to-markdown/)를 열고 .docx 파일을 놓은 뒤, "Markdown으로 변환"을 클릭하고 결과를 download.md로 다운로드하세요. 제목, 목록, 표, 굵게, 기울임꼴, 링크는 Markdown에 해당하는 형태로 그대로 유지되며, 모든 처리는 사용자의 기기 안에서 이루어집니다. 문서가 업로드되지 않고 계정도 필요 없으며, 변환된 Markdown은 Obsidian 노트, GitHub README, AI 어시스턴트 입력에 바로 쓸 수 있습니다.',
  quickSteps: [
    'DOCX를 Markdown으로 도구를 열고 .docx 파일을 드래그 앤 드롭하거나 클릭해서 추가합니다(오래된 .doc 파일은 먼저 .docx로 저장해야 합니다).',
    '"Markdown으로 변환" 버튼을 클릭합니다 — 문서는 브라우저 안에서 바로 파싱되고 재구성되며 보통 몇 초면 끝납니다.',
    '결과 카드에서 다운로드를 클릭하면 download.md로 저장됩니다.',
    'Obsidian, 위키, GitHub README, AI 어시스턴트에 붙여 넣습니다.',
  ],
  sections: [
    {
      heading: '단계별: NoriPDF로 변환하기',
      paragraphs: [
        '[DOCX를 Markdown으로 도구](/docx-to-markdown/)를 엽니다 — 설치할 것도, 만들 계정도 없습니다. 업로드 영역에 .docx 파일을 드래그하거나, 클릭해서 파일 선택 창에서 고릅니다.',
        '"Markdown으로 변환"을 클릭합니다. 문서는 브라우저 탭 안에서 바로 읽히고 재구성됩니다 — 소요 시간은 네트워크 속도가 아니라 문서에 따라 결정됩니다.',
        '다운로드 카드가 나타나면 다운로드를 클릭합니다. 결과는 download.md로 저장되며, 원본 .docx는 절대 수정되지 않습니다.',
      ],
      bullets: [
        '한 번에 .docx 파일 1개씩 변환',
        '구형 .doc 형식은 지원하지 않습니다 — 먼저 .docx로 저장하세요',
        '결과는 항상 download.md로 저장됩니다',
        '원본 문서는 수정되지 않습니다',
      ],
    },
    {
      heading: '변환 후 남는 것 — 그리고 단순화되는 것',
      paragraphs: [
        '변환기는 Word 구조를 Markdown 구조로 옮깁니다. 제목은 단계(#, ##, ###)를 유지하고, 글머리 기호와 번호 목록은 그대로 목록이 되며, 표는 GitHub 스타일 Markdown 표로 바뀌고, 굵게, 기울임꼴, 링크는 그대로 넘어옵니다.',
        'Markdown에 해당하는 요소가 없는 Word 기능은 사라지지 않고 단순화됩니다. 텍스트 상자, 다단 레이아웃, 떠 있는 이미지는 일반 읽기 순서로 평탄화되어 텍스트가 항상 자연스러운 순서로 도착합니다. 한 가지 의도적인 제한이 있습니다. 문서에 내장된 이미지는 추출되지 않습니다 — .md 파일은 텍스트만 담습니다.',
      ],
    },
    {
      heading: '왜 Markdown인가 — 그리고 왜 로컬에서 처리하는가',
      paragraphs: [
        'Markdown은 현대 글쓰기 도구의 공용어입니다. Obsidian 저장소, Notion 가져오기, 위키, GitHub README, 정적 사이트 생성기 등 어디에서나 쓰이죠. AI 어시스턴트가 가장 잘 읽는 형식이기도 합니다 — ChatGPT나 Claude에 Markdown을 붙여 넣으면 서식 없는 텍스트 덩어리가 아니라 문서 구조가 그대로 전달됩니다.',
        '그리고 그런 파일일수록 남의 서버에 올리고 싶지 않습니다. 내부 보고서, 계약서 초안, 회의 메모, 출간 전 원고 같은 문서 말입니다. NoriPDF는 파일이 이미 있는 곳에서 변환합니다 — 브라우저가 .docx를 읽고 .md를 디스크에 쓰며, 그 사이에 전송되는 것은 아무것도 없습니다. 탭을 닫으면 흔적도 남지 않습니다.',
      ],
    },
    {
      heading: '다른 도구와 함께 쓰기',
      paragraphs: [
        '스프레드시트도 같은 방식으로 처리하고 싶다면 [XLSX를 Markdown으로](/xlsx-to-markdown/)가 모든 시트를 Markdown 표로 바꿔 줍니다. 출처가 Word가 아니라 PDF라면 [PDF를 Markdown으로](/pdf-to-markdown/)가 텍스트 레이어를 똑같이 추출하고 구조화합니다.',
        '원본이 Google Doc이라면 먼저 내보내세요(파일 → 다운로드 → Microsoft Word .docx), 그다음 다운로드받은 파일을 여기서 변환하면 됩니다.',
      ],
    },
  ],
  alternatives: [
    {
      heading: 'Word 또는 LibreOffice에서 일반 텍스트로 저장',
      paragraphs: [
        '모든 워드 프로세서는 문서를 .txt 파일로 저장할 수 있습니다. 무료이고 오프라인에서 되지만, 결과물에는 구조가 없습니다. 제목, 목록, 표가 전부 평평한 텍스트가 되어 손수 다시 만들어야 합니다. 짧은 문단이라면 괜찮지만, 문서 전체에는 NoriPDF의 구조 보존이 확실히 시간을 아껴 줍니다.',
      ],
    },
    {
      heading: '명령줄에서 Pandoc 사용',
      paragraphs: [
        'Pandoc은 .docx를 Markdown으로 네이티브 변환합니다(`pandoc report.docx -o report.md`). 배치 변환을 스크립트로 돌릴 때 적합한 도구입니다. 대신 설치가 필요하고 명령줄을 쓸 줄 알아야 하며, 복잡한 표에서 가끔 깔끔하지 않은 결과가 나올 수 있습니다. 브라우저에서 한 번만 변환한다면 NoriPDF는 파일 하나면 족합니다.',
      ],
    },
    {
      heading: '온라인 변환기와 AI 어시스턴트',
      paragraphs: [
        '클라우드 변환기나 채팅 기반 어시스턴트도 올린 .docx를 Markdown으로 바꿔 주지만, 정리가 많이 필요할 수 있습니다. 비용은 업로드 자체와 무료 요금제의 용량 제한, 그리고 계정이나 일일 할당량입니다. 공개 문서라면 그런 선택도 괜찮지만, 기밀 문서라면 파일을 한 번도 전송하지 않는 로컬 도구가 더 안전한 기본값입니다.',
      ],
    },
  ],
  edgeCases: [
    {
      heading: '파일이 .docx가 아니라 .doc인 경우',
      paragraphs: [
        '이 도구는 최신 .docx 형식만 읽습니다. 오래된 .doc 파일은 Word 또는 LibreOffice에서 열고 다른 이름으로 저장 → .docx를 선택한 뒤, 새 파일을 변환하세요.',
      ],
    },
    {
      heading: '수정 내용 추적과 주석',
      paragraphs: [
        '변환기는 파일에 저장된 문서 텍스트 그대로를 읽습니다. 검토 흔적이 많은 문서라면 변환 전에 Word에서 수정 내용 추적을 수락하거나 거부하고 주석을 해결해 두세요.',
      ],
    },
    {
      heading: '복잡한 레이아웃은 단순하게 정리됩니다',
      paragraphs: [
        '텍스트 상자, 단, 떠 있는 이미지로 꾸민 잡지 스타일 페이지는 일반 읽기 순서로 평탄화됩니다. 문구는 전부 살아 있습니다. 순서가 중요하면 결과물을 빠르게 훑어보고 가끔 문단을 옮겨 주세요.',
      ],
    },
  ],
  faqs: [
    {
      q: 'NoriPDF로 Word를 Markdown으로 변환하는 것은 무료인가요?',
      a: '네 — 모든 NoriPDF 도구는 워터마크, 일일 할당량, 프리미엄 등급 없이 영원히 무료입니다. 변환이 사용자 기기에서 실행되므로 서버 비용도 없습니다.',
    },
    {
      q: '어떤 서식이 보존되나요?',
      a: '제목, 글머리 기호 및 번호 목록, 표, 굵게, 기울임꼴, 링크가 Markdown에 해당하는 형태로 변환됩니다. 복잡한 레이아웃(텍스트 상자, 단, 떠 있는 이미지)은 읽기 순서로 단순화되며, 내장 이미지는 추출되지 않습니다.',
    },
    {
      q: '.doc 파일도 되나요?',
      a: '아니요 — 최신 .docx 형식만 지원됩니다. 오래된 .doc 파일은 Word 또는 LibreOffice에서 열어 먼저 .docx로 저장하세요.',
    },
    {
      q: '변환한 Markdown은 어디에 쓸 수 있나요?',
      a: 'Obsidian, Notion, 위키, GitHub README, 정적 사이트 생성기는 물론, ChatGPT, Claude 등 AI 도구의 깔끔한 입력으로도 좋습니다. Markdown은 AI가 가장 잘 읽는 형식입니다.',
    },
    {
      q: '기밀 문서를 여기서 변환해도 안전한가요?',
      a: '네. 파일은 브라우저 안에서 읽히고 변환되며 어디에도 업로드되지 않습니다. 페이지를 불러온 후 인터넷 연결을 끊어도 동작하고, 탭을 닫으면 모든 흔적이 사라집니다.',
    },
  ],
  related: ['how-to-convert-xlsx-to-markdown', 'how-to-convert-pdf-to-markdown', 'how-to-merge-pdf'],
};
