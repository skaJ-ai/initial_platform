# Terminology — 사내 용어 정의

> 외부 산업 용어와 다를 수 있는 내부 정의. 빌드/문서/협의 시 일관 사용.

---

## 1. Agent / Skill / Tool — 3계층 (부서원 정의)

### Agent
- **정의**: 업무 프로세스(L5 또는 L6 기준)에 대한 설명 + 활용 가능 도구의 묶음
- **본질**: 프로세스 자산이 "살아 있는 실행 단위"로 묶인 것
- **예시**: "신규 입사자 입과 안내 Agent" — L6 표준 흐름 + 필요 Skill/Tool 묶음

### Skill
- **정의**: 특정 업무를 진행하기 위한 노하우. md 형태.
- **본질**: 회사 표준 지침. LLM 컨텍스트로 주입되는 작업 매뉴얼.
- **예시**: "출장비 산정 시 고려사항", "임원 보고용 표 vs 캡처 결정 기준"

### Tool
- **정의**: Skill 또는 Agent에서 호출 가능한 코드 기반 정확 동작
- **본질**: 결정적 액션. 산업 표준 tool calling과 동일.
- **예시**: 임직원 정보 조회, 잔여휴가 계산기, 출장비 계산기

## 2. Agent/Skill/Tool 사용 원칙

### 2.1 사용자에게 노출하지 말 것

HR 담당자에게 "Agent를 고르고 Skill을 고르세요"라고 노출하면 UX 실패.

- ❌ 사용자가 Skill 메뉴를 헤맴
- ⭕ 사용자에게는 "내 Work Card"만 보임. 시스템이 뒤에서 Agent/Skill/Tool 자동 결합.

### 2.2 Skill은 단순 md가 아니라 자산

Skill을 그냥 "md 파일"로 두면 prompt 모음일 뿐이고 엔터프라이즈가 카피 가능. 자산이 되려면 최소:

- **Versioned**: 누가 언제 만들었고 어떻게 진화했는지
- **Scoped**: 어느 L5/L6에 붙는지, 어느 팀이 쓰는지
- **Reviewed**: 누가 검수했고 어떤 trust tier인지 (개인 / 팀 / 조직)
- **Linked to outcome**: 이 Skill을 적용한 결과 품질 추적

### 2.3 Skill 콜드 스타트 진입로

People팀에 "Skill md를 작성하세요"는 잘 안 통한다. 진입로:

- **Process Coaching AI 자동 생성**: 분해 결과에서 L6별 표준 Skill md 초안 생성 → 사람 검수
- **사후 캡처**: 작업 카드 끝날 때 "결정적 판단 기준 한 줄"이 Skill 후보로 자동 큐잉

## 3. v3 운영 레이어 용어

### Mandate
- HR 담당자가 HR 데이터(임직원/평가/보상/인사위 등)를 처리하는 모든 행위는 우리 플랫폼 통과 필수
- 단순 일반 질의(번역/문서 요약/일반 정보)는 제외
- 경계는 분류표 v0가 정의

### Routing
- 민감도(Low/Med/High) × 복잡도(Low/Med/High) 매트릭스 기반 모델 선택
- 결과: Gauss / 엔터프라이즈 / 마스킹+엔터프라이즈

### Accumulation
- 사용 흔적이 회사 자산으로 누적되는 파이프라인
- 단계: Work Card → Tacit Candidate → Context Tag → Review Queue → Trust Tier 승급

### BYOM (Bring Your Own Model)
- 모델 슬롯 추상화. Gauss / KODEX / Claude / Gemini / 신규 모델이 같은 인터페이스로 끼움
- 7월 엔터프라이즈 도래 시 코드 변경 없이 슬롯 추가만으로 활용

### Application-side Audit
- 모델 vendor-side 로그와 별개로, 우리 플랫폼이 직접 기록하는 모든 LLM 호출 로그
- Gauss(vendor 로그 없음)도 엔터프라이즈도 동일 포맷으로 기록
- 보안 합의의 핵심 근거

## 4. 자산 모델 용어 ([AXIOM/Agentwork.md](../AXIOM/Agentwork.md) 차용)

### Work Card
- 담당자가 실제로 처리하는 하나의 일감 또는 케이스
- 세션 위 상위 객체. 한 카드에 여러 세션 가능.

### Tacit Candidate
- 업무 중 포착된 암묵지 후보
- 검토 전 상태. 자산 아님.

### Context Tag
- 지식이 어느 조건에서 유효한지 설명하는 태그
- audience / sensitivity / processStep / exceptionCondition / approvalStatus / bucketScope 등

### Review Queue
- 새 후보 지식의 검수 큐
- decision: fact_rejected / context_split / approved_team / approved_standard / merged

### Trust Tier
- raw signal → tacit candidate → reviewed working knowledge → team asset → verified standard asset
- Agent는 reviewed 이상만 사용

## 5. L 레벨 용어 (`HR-Process-Coaching-AI` 기반)

- **L3/L4**: 분절된 기능 도메인 (채용 / 보상 / 노사 …). 형제끼리 완전 독립.
- **L5/L6**: 연속된 프로세스 흐름. 형제는 전후 인접 단계.
- **L7**: 한 동작 단위 (아토믹 액션). HR 담당자가 직접 분해하는 최소 단위.

## 6. 모델 용어

### Gauss (사내 sLM)
- 오픈소스 모델 파인튜닝 기반 (삼성 Gauss)
- 모델 가중치 + 추론 + 로그까지 사내 통제
- vendor-side 로그 안 남기는 운영 가능
- 데이터 주권 100%, 벤더 의존도 0
- 약점: 사외 프론티어 대비 성능 약함

### Enterprise LLM (엔터프라이즈)
- KODEX / Claude / Gemini 등
- 2026-07부터 사내망에 도입 (AX팀 주관)
- 프론티어급 성능
- 일반 거버넌스(SSO/Audit/Retention) 동반
- 누수 채널 5종 존재 → [CONTEXT.md](./CONTEXT.md) 1.3 참조

### KODEX의 모호한 위치
- 사내 모델 취급인지 외부 상용 취급인지 확인 필요 → [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) Q2.3
