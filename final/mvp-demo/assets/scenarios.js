/**
 * HR AX Platform — MVP Demo Scenarios
 *
 * 카드 종류 4개 + 도메인별 일반 매뉴얼.
 * 다음 LLM이 이 데이터를 기반으로 실제 LLM 호출, 자산화, 검수 흐름을 구현.
 *
 * TODO (다음 LLM 작업):
 *  - 시나리오별 실제 prompt template 작성
 *  - Domain Agent 시스템 프롬프트 작성
 *  - 비식별화 게이트 로직 추가
 */

// ── 권한 단위 (현재 사용자 기본값) ──
const CURRENT_USER = {
  name: "장수하 프로",
  role: "L1 부문 People팀",
  permissionUnit: "부문 People팀 × 채용",
  workspace: "채용 Work-space"
};

// ── 시나리오 카드 4종 ──
const SCENARIOS = [
  {
    id: "card-001",
    type: "formal",                     // formal | informal
    grade: "confidential",              // confidential | sensitive | general
    domain: "채용",
    process: "L3 채용 / L5 서류평가",
    title: "신규 지원자 직무적합성평가",
    description: "정형 카드 + Domain Agent 있음. 기밀 등급 (지원자 개인정보 + 평가).",
    assembly: {
      agent: {
        type: "Domain Agent",
        name: "채용 직무적합성평가 Agent",
        sub: "지원자 서류 특이사항 하이라이트 + 직무 적합성 점수"
      },
      skill: {
        name: "지원자 직무적합성 평가 기준",
        sub: "Lab 정형화 매뉴얼 (md)"
      },
      tool: ["임직원 정보 조회기", "학력 검증기"],
      context: ["채용 도메인 표준 데이터", "유사 지원자 케이스 (지식 데이터)"]
    },
    routing: {
      grade: "기밀",
      model: "사내 LLM (GAUSS, 로그 미저장)",
      reason: "지원자 개인정보 + 평가 의도"
    },
    samplePrompt: "다음 지원자 서류를 검토하고 직무 적합성을 평가해 주세요.\n[지원자 서류 본문 placeholder]",
    sampleAgentReply: "지원자 서류 검토 결과 (sample):\n\n• 학력: 적합 (관련 전공)\n• 경력: 부분 적합 (직무 관련 3년 / 요구 5년)\n• 특이사항: 자격증 만료 확인 필요\n\n→ 권장: 1차 보류, 자격증 갱신 확인 후 재검토"
  },
  {
    id: "card-002",
    type: "formal",
    grade: "sensitive",
    domain: "제도",
    process: "L3 제도 / L5 평가제도",
    title: "신규 평가 제도 모판 작성",
    description: "정형 카드 + Domain Agent 미구축. Skill·Tool만으로 처리.",
    assembly: {
      agent: null,                      // Domain Agent 미구축
      skill: {
        name: "평가 제도 모판 양식 매뉴얼",
        sub: "Lab 정형화 매뉴얼 (md)"
      },
      tool: ["표준 양식 템플릿 조회기"],
      context: ["인사 제도 표준 데이터", "과거 모판 사례 (지식 데이터)"]
    },
    routing: {
      grade: "민감",
      model: "사외 LLM (Chat GPT / Gemini) — 비식별화 게이트 통과 후",
      reason: "특정 임원 평가 사례 인용 가능성"
    },
    samplePrompt: "다음 평가 제도 신규 모판 작성. [예시 임원 케이스 placeholder]",
    sampleAgentReply: "신규 평가 제도 모판 (sample):\n\n1. 평가 대상\n2. 평가 항목 및 가중치\n3. 평가 절차\n4. 이의 신청\n\n[비식별화된 사례를 참고하여 작성됨. 사내 재매핑 후 표시]"
  },
  {
    id: "card-003",
    type: "informal",
    grade: "general",
    domain: "채용",
    title: "사외 채용시장 트렌드 정리",
    description: "비정형 카드. 사용자 자유 입력 + 도메인 일반 매뉴얼.",
    assembly: {
      agent: null,
      skill: {
        name: "채용 도메인 일반 매뉴얼",
        sub: "도메인 fallback 매뉴얼"
      },
      tool: [],
      context: ["채용 도메인 표준 데이터"]
    },
    routing: {
      grade: "일반",
      model: "사외 LLM 그대로",
      reason: "공개 정보, 임직원 정보 미포함"
    },
    samplePrompt: "올해 IT 업계 채용시장 트렌드 정리해줘. 우리 직무군 중심으로.",
    sampleAgentReply: "IT 채용시장 트렌드 (sample):\n\n• AI 엔지니어 수요 급증 (전년 대비 +40%)\n• 데이터 직군 채용 정체\n• 풀스택 개발자 선호도 상승\n\n→ 우리 직무군 영향: AI/ML 직군 채용 가속 필요"
  },
  {
    id: "card-004",
    type: "formal",
    grade: "confidential",
    domain: "임원조직",
    process: "L3 임원조직 / L5 인사위",
    title: "다음달 임원 인사위 안건 정리",
    description: "정형 카드 + Domain Agent 있음. 기밀 등급 (임원 식별자 + 평가 이력).",
    assembly: {
      agent: {
        type: "Domain Agent",
        name: "인사위 안건 정리 Agent",
        sub: "안건 자동 정리 + 우선순위 제안"
      },
      skill: {
        name: "인사위 안건 양식·기준",
        sub: "Lab 정형화 매뉴얼 (md)"
      },
      tool: ["임원 인사 이력 조회기"],
      context: ["임원조직 표준", "지난 안건 사례 (권한 단위 한정)"]
    },
    routing: {
      grade: "기밀",
      model: "사내 LLM (GAUSS, 로그 미저장)",
      reason: "임원 식별자 + 평가 이력"
    },
    samplePrompt: "다음달 임원 인사위 안건을 작년 평가 이력 기반으로 정리해 주세요.",
    sampleAgentReply: "인사위 안건 정리 (sample):\n\n[안건 1] 임원 A 진급 검토\n• 작년 평가: A+\n• 주요 성과: ...\n\n[안건 2] 임원 B 보직 변경\n• 사유: ...\n\n→ 외부 송출 차단 · 사내 LLM 처리됨"
  }
];

// ── 도메인 카탈로그 (12개) ──
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

// Export to global scope for app.js
window.HRAX_DATA = {
  CURRENT_USER,
  SCENARIOS,
  DOMAINS
};
