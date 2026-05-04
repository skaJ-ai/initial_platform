# Terminology — 사내 용어 정의

> 외부 산업 용어와 다를 수 있는 내부 정의. 빌드/문서/협의 시 일관 사용.

---

## 1. Agent / Skill / Tool — 실행 레이어 3계층

### Agent
- **정의**: 업무 프로세스 또는 플랫폼 운영 기능을 실행 가능한 단위로 묶은 추상화
- **본질**: 프로세스 흐름 + Skill + Tool 권한 + 프롬프트/룰 버전의 결합
- **종류**:
  - **Domain Agent**: L5/L6 업무 프로세스 단위 실행체
  - **System Agent**: 분류, 차폐 검사, 자산 추출처럼 사용자에게 보이지 않는 운영 단위
- **예시**: "신규 입사자 입과 안내 Agent" — L6 표준 흐름 + 필요 Skill/Tool 묶음
- **예시**: "데이터 민감도 분류 Agent" — 조직×도메인 권한 룰 + PII 패턴 + 사내 LLM 호출 묶음

### Skill
- **정의**: 특정 업무를 진행하기 위한 노하우. md 형태.
- **본질**: 데이터 종이 아니라 실행 레이어 자료. LLM 컨텍스트로 주입되는 작업 노하우.
- **예시**: "출장비 산정 시 고려사항", "임원 보고용 표 vs 캡처 결정 기준"
- **보관**: 플랫폼 코드 리포지토리에 정의를 두고, 별도 DB에 메타·임베딩을 둠

### Tool
- **정의**: Skill 또는 Agent에서 호출 가능한 코드 기반 정확 동작
- **본질**: 결정적 액션. 산업 표준 tool calling과 동일.
- **예시**: 임직원 정보 조회, 잔여휴가 계산기, 출장비 계산기

## 2. Agent/Skill/Tool 사용 원칙

### 2.1 사용자에게 노출하지 말 것

HR 담당자에게 "Agent를 고르고 Skill을 고르세요"라고 노출하면 UX 실패.

- ❌ 사용자가 Skill 메뉴를 헤맴
- ⭕ 사용자에게는 "내 Work Card"만 보임. 시스템이 뒤에서 Agent/Skill/Tool 자동 결합.

### 2.2 Skill은 단순 md가 아니라 실행 레이어 자산

Skill을 그냥 "md 파일"로 두면 prompt 모음일 뿐이고 사외 LLM/Custom GPT가 카피 가능. 자산이 되려면 최소:

- **Versioned**: 누가 언제 만들었고 어떻게 진화했는지
- **Scoped**: 어느 L5/L6에 붙는지, 어느 팀이 쓰는지
- **Reviewed**: 누가 검수했고 어떤 공개 범위인지 (개인 / 권한 단위 / 도메인 종방향 / 전사)
- **Linked to outcome**: 이 Skill을 적용한 결과 품질 추적
- **Searchable**: Workbench가 조직/도메인/카드 본문을 보고 자동 매칭할 수 있는 메타·임베딩

### 2.3 Skill 콜드 스타트 진입로

People팀에 "Skill md를 작성하세요"는 잘 안 통한다. 진입로:

- **Process Coaching AI 자동 생성**: L6별 실행 노하우 초안 생성 → 사람 검수
- **사후 캡처**: 작업 카드 끝날 때 "결정적 판단 기준 한 줄"이 Skill 후보로 자동 큐잉
- **자산 승격**: 자동 포착 → Domain Experts 초안 → AX&CI Lab 정형화·등록

### 2.4 데이터 레이어와 실행 레이어 분리

데이터 종은 ① 운영 데이터, ② 표준 데이터, ③ 자산 데이터 3종으로 고정한다. Agent / Skill / Tool은 데이터 종이 아니라 실행 레이어 자료다.

```
[데이터 레이어]                [실행 레이어]
 ① 운영 데이터 (Master)         Workbench
 ② 표준 데이터 (Standards)      Work Card
 ③ 자산 데이터 (Knowledge)      Agent / Skill / Tool
                                데이터 민감도 분류 Agent
                                비식별화 게이트
```

② 표준 데이터는 규정 / 기준 / 업무 프로세스 / 표준 양식으로 한정한다. Skill md는 ② 표준 데이터에 넣지 않는다.

## 3. v3 운영 레이어 용어

### Mandate
- HR 담당자가 HR 데이터(임직원/평가/보상/인사위 등)를 처리하는 모든 행위는 우리 플랫폼 통과 필수
- 단순 일반 질의(번역/문서 요약/일반 정보)는 제외
- 경계는 분류표 v0가 정의

### 조직×도메인 권한 단위
- 기존 논의에서 "셀"이라고 부르던 단위
- 정의: 특정 조직 범위와 HR 도메인의 조합
- 예시: `부문 People팀 × 보상`, `MX사업부 × 채용`, `VD사업부 × 임원조직`
- 역할: DW 접근 범위, 표준 데이터 RAG 범위, 자산 데이터 공개 범위, 차폐 정책, Domain Experts를 결정하는 기본 단위
- 문서 대외 표현은 "셀"보다 **조직×도메인 권한 단위**를 우선 사용

### Routing
- 민감도(Low/Med/High) × 복잡도(Low/Med/High) 매트릭스 기반 모델 선택
- 결과: 사내 LLM(GAUSS) / 사외 LLM / 마스킹+사외 LLM
- 분류 단계 입력은 민감 데이터일 수 있으므로 사외 LLM을 절대 호출하지 않음
- 분류는 데이터 민감도 분류 Agent가 사내 LLM(GAUSS) 전담으로 수행

### Accumulation
- 사용 흔적이 회사 자산으로 누적되는 파이프라인
- 단계: Work Card → Tacit Candidate → Context Tag → Review Queue → 자산 신뢰 단계 승급

### AI Tool
- HR AX가 연계하는 AI 기반 처리 도구
- 범위:
  - 사내 LLM (GAUSS): 기밀 처리, 분류 보강, 사내 임베딩. LLM 자체 로그 미저장
  - 사외 LLM (Chat GPT / Gemini 등): 일반 또는 비식별화 후 복잡 추론
  - 사내 AI Tool: 전사 AX팀이 제공하는 일부 AI Tool
- 결재, 메일, 캘린더, HR 시스템 API는 AI Tool이 아니라 일반 업무 Tool 또는 원천 시스템 연계
- 사외 LLM은 원문 HR Data/Knowledge에 직접 접근하지 않고, HR AX가 권한 확인·비식별화·감사 로그를 거친 차폐 컨텍스트만 받음
- 사내 AI Tool은 HR AX의 권한·분류·차폐 정책을 통과한 경우에만 제한 연계

### BYOM (Bring Your Own Model)
- 모델 슬롯 추상화. 사내 LLM(GAUSS), 사외 LLM(Chat GPT / Gemini 등), 신규 모델이 같은 인터페이스로 끼움
- AI Tool 추가 시 코드 변경 없이 슬롯 추가만으로 활용

### Application-side Audit
- 모델 vendor-side 로그와 별개로, 우리 플랫폼이 직접 기록하는 모든 LLM 호출 로그
- 사내 LLM(GAUSS, LLM 자체 로그 미저장)도 사외 LLM도 동일 포맷으로 기록
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

### 자산 신뢰 단계
- 내부 구현 용어. 기존 문서의 Trust Tier를 대외 설명용으로 바꾼 표현
- raw signal → tacit candidate → 검수 통과 자산 → 권한 단위 자산 → 전사 표준 자산
- Agent는 최소 검수 통과 자산 이상만 사용

## 5. L 레벨 용어 (`HR-Process-Coaching-AI` 기반)

- **L3/L4**: 분절된 기능 도메인 (채용 / 보상 / 노사 …). 형제끼리 완전 독립.
- **L5/L6**: 연속된 프로세스 흐름. 형제는 전후 인접 단계.
- **L7**: 한 동작 단위 (아토믹 액션). HR 담당자가 직접 분해하는 최소 단위.

## 6. 모델 용어

### GAUSS (사내 LLM)
- 오픈소스 모델 파인튜닝 기반 (삼성 Gauss)
- 모델 가중치 + 추론 + 로그까지 사내 통제
- vendor-side 로그 안 남기는 운영 가능
- 데이터 주권 100%, 벤더 의존도 0
- 약점: 사외 프론티어 대비 성능 약함

### 사외 LLM
- Chat GPT / Gemini 등 사외 LLM 계열
- 2026-07부터 사내망에 도입 (AX팀 주관)
- 프론티어급 성능
- 일반 거버넌스(SSO/Audit/Retention) 동반
- 누수 채널 5종 존재 → [CONTEXT.md](./CONTEXT.md) 1.3 참조

### 모델별 보안 정책
- 사외 LLM별 로그/retention/감사 정책은 [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) Q2.3에서 확인 필요
