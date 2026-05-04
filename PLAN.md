# 11월까지 Plan

> 코드 트랙과 정치 트랙 병렬. 정치가 코드보다 먼저 출발해야 한다.
> 정치가 받쳐주면 진짜 차별 플랫폼, 안 받쳐주면 또 하나의 사내 챗 도구.

---

## 1. 개발 로드맵 — Backlog 중심

로드맵은 숫자 목표가 아니라 **기존 HR AX Platform이 HR 데이터 특성상 갖춰야 할 능력의 순서**로 관리한다.

| 단계 | 갖춰야 할 것 | 핵심 백로그 |
|---|---|---|
| 1 | 보안 기반 | 분류표 v0, 데이터 민감도 분류 Agent, application-side audit |
| 2 | 안전 게이트 | 라우팅 정책, 비식별화/재매핑, 사외 LLM function calling |
| 3 | 권한 체계 | 조직×도메인 권한 단위, DW/표준/자산 데이터 접근 제어, retrieval eligibility |
| 4 | 축적 파이프라인 | Work Card, Tacit Candidate, Review Queue, 자산 신뢰 단계 |
| 5 | 운영화 | Skill 라이브러리, Tool 카탈로그, 분류표 갱신 루프, 운영 모니터링 |

## 2. 정치 트랙 (병렬, 우선)

### 2.1 P0 — 정책 기반

- [ ] **강제 정책 초안 v0**
  - 범위: HR 데이터 처리 시 우리 플랫폼 통과 필수. 단순 일반 질의는 제외.
  - 경계는 분류표 v0가 정의.
  - 첫 협의 자료 프레이밍: "원문 HR Data/Knowledge는 전사 공통 AI Platform에 올리지 않고, HR AX가 사전 분류와 권한 통제를 담당".
  - 산출물: `private/policy/mandate-v0.md` (외부 미공개)

- [ ] **민감도 분류표 v0**
  - HR 도메인 데이터 카테고리별 민감도 등급 (Low / Med / High)
  - People팀 + 정보보호센터 + 노무 일치 필요
  - v0는 좁게 시작 → 운영하며 확장
  - 데이터 민감도 분류 Agent의 1차 룩업 테이블로 사용
  - 조직×도메인 권한 단위별 기본 등급·차폐 정책·검수자까지 함께 정의
  - 산출물: `private/policy/sensitivity-v0.yaml`

- [ ] **People팀장 컨센서스 확보**
  - 가져갈 자료: [ONE_PAGER.md](./ONE_PAGER.md) + HR 데이터 직접 AI Tool 사용 위험 시나리오 + 안전 게이트 정당성
  - 결과 목표: 플랫폼 강화 방향 승인 + 정보보호센터 카운터파트 지정

### 2.2 P1 — 합의 확장

- [ ] **정보보호센터 동의** — People팀 내부라 정치적 가능성 높음. 강제 정책 보안 정당성 확보.
- [ ] **AX팀과 영역 분리 합의** — "AX팀 인프라 위에 우리 도메인 정책" 프레임. AI Gateway는 AX팀 영역으로 인정.
- [ ] **노무팀 사전 협의** — 자산 누적이 "감시 도구"로 비치지 않게 동의·투명성 메커니즘 설명.
- [ ] **법무 사전 검토** — HR 데이터 처리 강제의 법적 근거 정리.

### 2.3 P2 — 공식화

- [ ] **강제 정책 발효** — 사외 LLM/사내 AI Tool 확산 전후 즉시. 늦으면 사용자 우회 학습.
- [ ] **CISO/보안위원회 공식 승인** — 강제 정책 공식 문서화.

## 3. 코드 트랙

### 3.1 P0 — 보안/Routing 레이어

- [ ] **(가) 분류표 v0 데이터화**
  - 정치 트랙의 yaml을 코드에서 사용 가능한 구조로 (loader + cache)
  - 카테고리, 등급, 패턴 정의
  - 산출물: `src/policies/sensitivity/loader.ts`, schema test

- [ ] **(나) 데이터 민감도 분류 Agent v0**
  - 입력: 사용자 요청 + Work Card 컨텍스트 + 조직×도메인 권한 단위
  - 처리: 권한 단위 기본 등급 룩업 → PII 패턴 매칭 → 사내 LLM(GAUSS) 맥락 보강
  - 사외 LLM 호출 금지. 분류 단계 입력이 민감 데이터일 수 있으므로 사내에서 완결
  - 출력: `{등급, 차폐 후보 항목, 신뢰도, 근거}`
  - 산출물: `src/classification/agent.ts`, `src/classification/pii-patterns.ts`

- [ ] **(다) 사용자 등급 상향 처리**
  - 사용자는 상향만 가능, 하향 불가
  - 상향 시 즉시 적용 + audit log + 권한 단위 Domain Expert 통지
  - 같은 권한 단위에서 반복 상향 발생 시 분류표 v0 갱신 후보 큐잉
  - 산출물: `src/classification/override.ts`, `classification_overrides` 테이블

- [ ] **(라) 라우팅 엔진 v0**
  - 입력: 사용자 요청 + Work Card 컨텍스트 + 분류 결과
  - 출력: 모델 선택 (사내 LLM(GAUSS) / 사외 LLM / 마스킹+사외 LLM), 변환 지시
  - BYOM 인터페이스 추상화 — 모델 슬롯 교체 가능
  - 산출물: `src/routing/router.ts`, `src/routing/byom-adapter.ts`

- [ ] **(마) 마스킹/익명화 변환기**
  - 별표 영역(중간 민감 + 복잡 추론)에서 사용
  - 임직원 식별자 → 익명 ID, 부서명 → 일반화, 금액 → 범위
  - 변환 정책도 People팀 합의 자산
  - 산출물: `src/routing/masking.ts`, `private/policy/masking-v0.yaml`

- [ ] **(바) Application-side Audit Log**
  - 모든 LLM 호출의 정책 결정 / 입력 / 출력 / 근거 기록
  - 사내 LLM(GAUSS), 사외 LLM, 사내 AI Tool 모두 동일하게
  - 분류 Agent 결과와 사용자 상향 이벤트도 동일 audit 체계에 포함
  - 보안 합의의 핵심 근거
  - 산출물: `src/audit/logger.ts`, `audit_logs` 테이블

### 3.2 P1 — Accumulation 파이프라인

[AXIOM/Agentwork.md](../AXIOM/Agentwork.md)의 데이터 모델 차용. Phase 0~4:

- [ ] **Phase 0/1: Work Card 도입**
  - `work_cards` 테이블 + 세션 → 카드 연결
  - 모든 작업이 카드 위에서 시작

- [ ] **Phase 2: Tacit Candidate 추출**
  - 대화 중 intent signal → `tacit_candidates`
  - assistant marker + 서버 측 추출 두 경로

- [ ] **Phase 3: Context Tag**
  - audience / sensitivity / exception 등 최소 태그 세트
  - retrieval의 eligibility filter

- [ ] **Phase 4: Review Queue**
  - reviewer decision flow
  - 충돌 탐지 (fact / context mismatch / same-context policy)
  - 공개 범위 확정: 작성자 제안 + 검수자 확정
  - 1인 권한 단위는 자가 검수 허용, 단 개인/권한 단위 한정만 기본 허용
  - 2인 이상 권한 단위는 교차 검수 필수

### 3.3 P2 — 운영화/출시 준비

- [ ] **Phase 5: 자산 신뢰 단계 승급** — 검수 전 후보 / 검수 통과 자산 / 권한 단위 자산 / 전사 표준 자산 분리. Agent는 검수 통과 이상만 사용.
- [ ] **자산 → 표준 / Skill 승격 큐**
  - 자동 포착은 동일 메커니즘
  - Lab이 신규 L6 / 신규 Skill / 둘 다 / 둘 다 아님 4분기 결정
  - ③→② 표준 승격은 규정/기준/업무 프로세스 형태일 때만
- [ ] **Skill 라이브러리 저장·검색**
  - 코드 리포지토리: Skill 정의 원본
  - DB: 메타·임베딩·검색 인덱스
  - Workbench 카드 진입 시 조직/도메인/본문 기반 자동 매칭
- [ ] **Tool 카탈로그 운영**
  - HR 담당자 Tool 요청 양식
  - AX&CI Lab 보안·중복·우선순위 검토
  - 구현 후 카탈로그 등록, Agent에서 호출 가능
- [ ] **Workflow Orchestration v1** — L4/L5/L6 자산 위 다단계 흐름. 결재/승인 라인 시각화.
- [ ] **UX — 부드러운 강제** — 콜드 스타트가 채팅창이 아니라 "내 Work Card + 회사 컨텍스트". 사용자가 Skill 단어 모른 채 일 끝낼 수 있게.
- [ ] **데모 시나리오 3종 완성** — [POSITIONING.md](./POSITIONING.md) 4절 시나리오 A/B/C 동작.

## 4. 의사결정 필터

빌드 중 모든 기능에 적용:

1. 이 기능, 사외 LLM(Chat GPT / Gemini 등)이나 Custom GPT로도 동일 가능? → Yes면 보안/축적/권한 중 하나가 명확히 얹혀야 함.
2. 이 기능, 사용자가 Skill/Agent/Tool 단어를 알아야 동작? → Yes면 UX 재설계.
3. 이 기능이 자산 누적을 만드는가? → No면 우선순위 낮춤.

## 5. 운영 점검 항목

숫자 목표를 먼저 박지 않고, 각 백로그가 실제로 작동하는지 확인할 관측 항목부터 둔다.

| 카테고리 | 관측 항목 | 확인할 것 |
|---|---|---|
| **보안** | 원문 HR Data/Knowledge 공통 AI Platform 미적재 | 정책·시스템 양쪽에서 막히는가 |
| **보안** | 분류 Agent와 라우팅 근거 | 사내에서 완결되고 audit에 남는가 |
| **보안** | 비식별화/재매핑 | 사외 LLM에는 차폐된 맥락만 나가는가 |
| **권한** | 조직×도메인 권한 단위 | DW/표준/자산 데이터 접근이 필요한 만큼만 열리는가 |
| **축적** | Tacit Candidate → Review Queue | 사용 흔적이 검수 가능한 후보로 남는가 |
| **축적** | 자산 데이터 retrieval | 검수 통과 자산만 다음 Work Card에 붙는가 |
| **운영** | Skill/Tool 카탈로그 | 사용자가 직접 고르지 않아도 Work Card에 자동 부착되는가 |

## 6. Go / No-Go 결정점

각 시점에 Go/No-Go 판단. No면 v3.1 (강제 약화 + UX 강화) 또는 v4 (재설계) 검토.

| 시점 | Go 조건 | No이면 |
|---|---|---|
| 정책 합의 전 | 분류표 v0 합의 + People팀장 승인 | 정책 합의 트랙 가속 또는 강제 → 강한 권장으로 약화 |
| 사외 LLM/사내 AI Tool 확산 전후 | 정보보호센터 + AX팀 영역 분리 합의 | 발효 시점 조정. 코드 트랙 단독 진행. |
| 출시 범위 확정 전 | 분류·라우팅·마스킹·Audit 동작 | 출시 범위 축소 (Accumulation 일부 미루기) |
| 데모 확정 전 | 대표 시나리오 동작 | 출시 연기 또는 시나리오 축소 |

## 7. 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| 정치 트랙 지연 | v3.1로 약화 (강제 → 강한 권장 + 압도적 UX). Mandate 약화하지만 보안·축적·권한 메커니즘 유지. |
| AX팀이 자체 게이트웨이에 HR 정책까지 넣겠다고 함 | "도메인 정책은 People팀 책임" 영역 분리 재확인. Policy API 인터페이스로 위임 받는 형태로 협상. |
| GAUSS 성능이 너무 떨어져 별표 영역 대부분이 마스킹+사외 LLM으로 감 | 정책 자산 가치 자체는 유효. "GAUSS 성능 개선이 곧 우리 가치 증가"라는 동맹 관계로 GAUSS 운영팀과 연계. |
| 동료가 Skill 기반 가설 고집 | 부서 분열 방지. 두 안 비교 자료를 People팀장에게 제출하여 결정 받기. |
| 사용자 베이스 콜드스타트 (강제만으론 형식적 사용) | UX P0 강화. 첫 데모에서 "어차피 더 편하다" 증명. 자산 누적 메커니즘으로 "쓸수록 좋아짐" 시각화. |
| 분류기 false negative (민감 → 비민감 오분류) | 분류 Agent를 보수적으로 운영 (의심스러우면 GAUSS). 사용자 상향과 사후 audit으로 오분류 감지 → 분류표 갱신 루프. |

## 8. 11월 출시물의 한 줄 정의 (목표)

> "L4/L5/L6 프로세스 자산 위에 깔린 HR Work Card 운영면. 원문 HR Data/Knowledge는 전사 공통 AI Platform에 올리지 않는다. 사용자 작업이 들어오면 조직×도메인 권한 단위와 사내 데이터 민감도 분류 Agent가 먼저 등급과 차폐 후보를 확정하고, 라우팅·마스킹을 거쳐 적절한 AI Tool(사내 LLM(GAUSS), 사외 LLM, 사내 AI Tool)로 보낸다. 결과는 Tacit Candidate 추출 + Review Queue를 통해 회사 자산으로 누적된다. 모든 호출과 상향 이벤트는 application-side audit으로 추적된다."

이 문장이 출시 후 People팀장이 외부에 한 줄로 설명할 수 있어야 v3 성공.
