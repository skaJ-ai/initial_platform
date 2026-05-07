/**
 * HR AX Platform — MVP Demo Scenarios
 *
 * 시연 카드 4종과 라우팅 흐름을 담은 정적 데이터입니다.
 */

const CURRENT_USER = {
  name: "김삼성 프로",
  role: "MX사업부 People팀",
  org: "MX사업부",
  domains: ["채용", "제도", "임원조직"],
  permissionUnit: "MX사업부 People팀 × 채용/제도/임원조직",
  workspace: "내 HR AX Work-space"
};

const PROCESS_CATALOG = {
  totalL6Label: "약 4,600개 L6",
  source: "HR-Process-Coaching-AI 더미 L3-L6",
  modeSummary: [
    {
      id: "guided",
      title: "Guided Work Mode",
      description: "로그인 권한, 최근 업무, 반복 패턴을 기준으로 플랫폼이 L6 후보와 Work Card를 먼저 제안합니다."
    },
    {
      id: "open",
      title: "Open Chat Mode",
      description: "완전 채팅창에서 시작하되, 플랫폼이 뒤에서 업무 의도와 L3-L6 후보를 추정합니다."
    }
  ],
  openCandidates: [
    {
      l3: "채용",
      l4: "인재발굴",
      l5: "인재 소싱 채널 선정 및 액팅",
      l6: "채널별 후보자 명단 취합",
      confidence: "0.78"
    },
    {
      l3: "제도",
      l4: "업적평가",
      l5: "결과 분석/보고 및 결과 안내",
      l6: "업적평가 결과 분석 보고서 확정",
      confidence: "0.71"
    },
    {
      l3: "임원조직",
      l4: "인력운영",
      l5: "임원 석세션 플랜",
      l6: "임원 석세션 후보군 명단 확정",
      confidence: "0.68"
    }
  ]
};

const ROUTE_STEPS_CONFIDENTIAL_RECRUIT = [
  { label: "권한 확인", delay: 200, status: "ok", detail: "MX People · 채용/제도/임원조직" },
  { label: "민감도 분류", delay: 600, status: "ok", detail: "기밀 (PII + 평가 의도)" },
  { label: "라우팅 결정", delay: 100, status: "ok", detail: "사내 LLM (GAUSS, 로그 미저장)" },
  { label: "비식별화 게이트", delay: 0, status: "skip", detail: "기밀: 사외 송출 차단, 게이트 미적용" },
  { label: "모델 호출", delay: 800, status: "live", detail: "GAUSS 응답 스트리밍" }
];

const ROUTE_STEPS_SENSITIVE_REVIEW = [
  { label: "권한 확인", delay: 200, status: "ok", detail: "MX People · 제도" },
  { label: "민감도 분류", delay: 600, status: "ok", detail: "민감 (평가 결과 + 조직 분포)" },
  { label: "라우팅 결정", delay: 100, status: "ok", detail: "사외 LLM: 게이트 통과 필요" },
  { label: "비식별화 게이트", delay: 400, status: "ok", detail: "조직명 12건 차폐, 매핑 사내 보관" },
  { label: "모델 호출", delay: 800, status: "live", detail: "Chat GPT 응답 스트리밍" }
];

const DEFAULT_ROUTE_STEPS = [
  { label: "권한 확인", delay: 200, status: "ok", detail: "MX People · 채용" },
  { label: "민감도 분류", delay: 500, status: "ok", detail: "일반 (공개 시장 정보)" },
  { label: "라우팅 결정", delay: 100, status: "ok", detail: "사외 LLM 그대로" },
  { label: "비식별화 게이트", delay: 0, status: "skip", detail: "일반 등급: 미적용" },
  { label: "모델 호출", delay: 800, status: "live", detail: "Chat GPT 응답 스트리밍" }
];

const ROUTE_STEPS_CONFIDENTIAL_EXECUTIVE = [
  { label: "권한 확인", delay: 200, status: "ok", detail: "MX People · 임원조직" },
  { label: "민감도 분류", delay: 600, status: "ok", detail: "기밀 (임원 식별자 + 평가)" },
  { label: "라우팅 결정", delay: 100, status: "ok", detail: "사내 LLM (GAUSS, 로그 미저장)" },
  { label: "비식별화 게이트", delay: 0, status: "skip", detail: "기밀: 사외 송출 차단, 게이트 미적용" },
  { label: "모델 호출", delay: 800, status: "live", detail: "GAUSS 응답 스트리밍" }
];

const DEFAULT_ASSEMBLY = {
  agent: null,
  skill: { name: "Open Chat 일반 응답", sub: "도메인 비특정 fallback" },
  tool: [],
  context: ["일반 HR 도메인 지식 fallback"]
};

const DEFAULT_SAMPLE_REPLY =
  "[SAMPLE] LLM 미연결 또는 호출 실패 — 입력 의도를 기반으로 일반 응답을 작성해야 하는 자리입니다.\n\n" +
  "실제 운영에서는 분류 Agent가 권한·민감도·L3-L6 후보를 추정해 적절한 카드로 라우팅합니다.";

const SCENARIOS = [
  {
    id: "card-001",
    entryMode: "guided",
    type: "formal",
    grade: "confidential",
    domain: "채용",
    process: "L3 채용 / L4 선발전형 / L5 서류심사 / L6 서류 합격자 명단 확정",
    processMeta: {
      l3: "채용",
      l4: "선발전형",
      l5: "서류심사",
      l6: "서류 합격자 명단 확정",
      owner: "HR",
      reason: "HR·현업 종합 판단으로 합격자 확정"
    },
    title: "서류 합격자 명단 확정 지원",
    quickStartLabel: "서류 합격자 명단 확정",
    description: "Guided Work. 지원자 서류와 현업 검토 결과를 바탕으로 합격자 명단 확정안을 정리합니다.",
    assembly: {
      agent: {
        type: "Domain Agent",
        name: "채용 서류심사 Agent",
        sub: "지원자 특이사항 하이라이트 + 합격/보류 근거 정리"
      },
      skill: {
        name: "서류심사 합격자 확정 기준",
        sub: "L3-L6 프로세스 기준 매뉴얼"
      },
      tool: ["지원자 명단 추출기", "평가 결과 취합기", "채용Hub 조회기"],
      context: ["채용 L3-L6 표준 데이터", "서류심사 기준", "유사 합격/보류 케이스"]
    },
    routing: {
      grade: "기밀",
      model: "사내 LLM (GAUSS, 로그 미저장)",
      reason: "지원자 개인정보 + 평가 의도"
    },
    routeSteps: ROUTE_STEPS_CONFIDENTIAL_RECRUIT,
    samplePrompt: "서류심사 결과와 현업 의견을 기준으로 합격자 명단 확정안을 정리해 주세요.\n[지원자별 평가 요약 placeholder]",
    sampleAgentReply: "서류 합격자 명단 확정안 (sample):\n\n• 합격 권고: 8명\n• 보류 권고: 3명\n• 추가 확인 필요: 2명 (경력 연차·자격 유효기간)\n\n확인사항:\n1. 현업 보류 의견이 있는 후보의 근거 보강\n2. 자격 유효기간 만료 후보 재검증\n\n→ 권장: 보류 3명은 현업 확인 후 확정"
  },
  {
    id: "card-002",
    entryMode: "guided",
    type: "formal",
    grade: "sensitive",
    domain: "제도",
    process: "L3 제도 / L4 업적평가 / L5 결과 분석/보고 및 결과 안내 / L6 업적평가 결과 분석 보고서 확정",
    processMeta: {
      l3: "제도",
      l4: "업적평가",
      l5: "결과 분석/보고 및 결과 안내",
      l6: "업적평가 결과 분석 보고서 확정",
      owner: "HR",
      reason: "평가 결과 분석 보고서 HR 확정"
    },
    title: "업적평가 결과 분석 보고서 초안",
    quickStartLabel: "업적평가 보고서 초안",
    description: "Guided Work. 평가 결과 분포와 예외 사항을 비식별화해 보고서 구조로 정리합니다.",
    assembly: {
      agent: null,
      skill: {
        name: "업적평가 결과 분석 보고서 작성 기준",
        sub: "L3-L6 프로세스 기준 매뉴얼"
      },
      tool: ["평가 분포 집계기", "보고서 템플릿 조회기"],
      context: ["제도 L3-L6 표준 데이터", "업적평가 운영 기준", "과거 분석 보고서 사례"]
    },
    routing: {
      grade: "민감",
      model: "사외 LLM (Chat GPT / Gemini) — 비식별화 게이트 통과 후",
      reason: "개인 평가 결과와 조직 단위 분포 포함 가능성"
    },
    routeSteps: ROUTE_STEPS_SENSITIVE_REVIEW,
    samplePrompt: "업적평가 결과 분포와 주요 예외사항을 기반으로 분석 보고서 초안을 작성해 주세요.\n[평가 분포표 placeholder]",
    sampleAgentReply: "업적평가 결과 분석 보고서 초안 (sample):\n\n1. 전체 분포 요약\n2. 조직별 편차 및 원인 가설\n3. 예외 케이스 검토 필요 항목\n4. 후속 조치 제안\n\n[개인명·조직 세부 식별자는 비식별화 후 처리되었습니다.]"
  },
  {
    id: "card-003",
    entryMode: "open",
    type: "informal",
    grade: "general",
    domain: "채용",
    process: "Open Chat → 후보: L3 채용 / L4 인재발굴 / L5 인재 소싱 채널 선정 및 액팅",
    processMeta: {
      l3: "채용",
      l4: "인재발굴",
      l5: "인재 소싱 채널 선정 및 액팅",
      l6: "채널별 후보자 명단 취합",
      owner: "DW",
      reason: "채널별 자동 수집·집계"
    },
    title: "채용시장 트렌드와 후보 채널 영향 정리",
    quickStartLabel: "채용시장 트렌드 정리",
    description: "Open Chat. 자유 입력에서 시작하고, 플랫폼이 업무 의도와 L3-L6 후보를 뒤에서 추정합니다.",
    assembly: {
      agent: null,
      skill: {
        name: "채용 도메인 일반 매뉴얼",
        sub: "Open Chat fallback 매뉴얼"
      },
      tool: [],
      context: ["채용 L3-L6 표준 데이터", "인재발굴 업무 후보", "공개 시장자료"]
    },
    routing: {
      grade: "일반",
      model: "사외 LLM 그대로",
      reason: "공개 정보, 임직원 정보 미포함"
    },
    routeSteps: DEFAULT_ROUTE_STEPS,
    samplePrompt: "올해 IT 업계 채용시장 트렌드 정리해줘. 우리 직무군 중심으로.",
    sampleAgentReply: "IT 채용시장 트렌드 (sample):\n\n• AI 엔지니어 수요 급증 (전년 대비 +40%)\n• 데이터 직군 채용 정체\n• 풀스택 개발자 선호도 상승\n\n→ 우리 직무군 영향: AI/ML 직군 채용 가속 필요"
  },
  {
    id: "card-004",
    entryMode: "guided",
    type: "formal",
    grade: "confidential",
    domain: "임원조직",
    process: "L3 임원조직 / L4 인력운영 / L5 임원 석세션 플랜 / L6 임원 석세션 후보군 명단 확정",
    processMeta: {
      l3: "임원조직",
      l4: "인력운영",
      l5: "임원 석세션 플랜",
      l6: "임원 석세션 후보군 명단 확정",
      owner: "HR",
      reason: "석세션 후보 평가 기준 HR 확정"
    },
    title: "임원 석세션 후보군 명단 확정",
    quickStartLabel: "임원 석세션 후보군",
    description: "Guided Work. 임원 후보군, 포지션 매핑, 평가 근거를 사내 LLM에서만 처리합니다.",
    assembly: {
      agent: {
        type: "Domain Agent",
        name: "임원 석세션 플랜 Agent",
        sub: "후보군 요약 + 포지션 매핑 + 확인 필요 리스크 정리"
      },
      skill: {
        name: "임원 석세션 후보군 확정 기준",
        sub: "L3-L6 프로세스 기준 매뉴얼"
      },
      tool: ["임원 인사 원천 데이터 조회기", "후보군-포지션 매핑 조회기"],
      context: ["임원조직 L3-L6 표준 데이터", "석세션 후보 평가 기준", "보안문서 열람 이력"]
    },
    routing: {
      grade: "기밀",
      model: "사내 LLM (GAUSS, 로그 미저장)",
      reason: "임원 식별자 + 평가·후보군·포지션 정보"
    },
    routeSteps: ROUTE_STEPS_CONFIDENTIAL_EXECUTIVE,
    samplePrompt: "임원 석세션 후보군 명단과 후보별 근거를 정리하고, 확정 전 확인해야 할 리스크를 뽑아 주세요.",
    sampleAgentReply: "임원 석세션 후보군 검토 요약 (sample):\n\n[포지션 1] 후보군 3명\n• 후보 A: 직무 경험 충족, 최근 평가 우수\n• 후보 B: 글로벌 경험 강점, 보직 이동 가능성 확인 필요\n• 후보 C: 성과 안정적이나 후임 후보군 중복\n\n확인 필요:\n1. 후보 B의 이동 가능 시점\n2. 후보 C의 현 조직 리스크\n\n→ 임원 식별 정보 감지. 외부 송출 차단, 사내 LLM 처리됨."
  }
];

const DOMAINS = [
  { id: "education", name: "교육", count: 0 },
  { id: "labor", name: "노사", count: 0 },
  { id: "comp", name: "보상·근태", count: 0 },
  { id: "workforce", name: "인력운영", count: 0 },
  { id: "executive", name: "임원조직", count: 1 },
  { id: "system", name: "제도", count: 1 },
  { id: "recruit", name: "채용", count: 2 },
  { id: "general", name: "총무", count: 0 },
  { id: "global", name: "해외인사", count: 0 },
  { id: "dei", name: "DEI", count: 0 },
  { id: "culture", name: "조직문화", count: 0 },
  { id: "intellect", name: "집단지성", count: 0 }
];

window.HRAX_DATA = {
  CURRENT_USER,
  SCENARIOS,
  DOMAINS,
  PROCESS_CATALOG,
  DEFAULT_ROUTE_STEPS,
  DEFAULT_ASSEMBLY,
  DEFAULT_SAMPLE_REPLY
};
