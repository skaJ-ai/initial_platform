# HR AX Platform — Initial Positioning

> 삼성전자 People팀 / AXN 컬쳐이노베이션 랩
> 11월 출시 HR 플랫폼의 정체성·로드맵 1차 정리물
> Status: Draft v3 · Last update: 2026-05-04

---

## 한 줄

**HR AX Platform은 HR 데이터가 AI Tool로 가기 전에 반드시 거치는 HR 특화 안전 게이트다. 원문 HR Data/Knowledge는 전사 공통 AI Platform에 올리지 않고, 플랫폼 안에서 권한 확인·민감도 분류·비식별화·라우팅을 처리하며, 사용할수록 People 조직의 지식이 자산으로 축적된다.**

## 3대 강화 축

| | 축 | 한 줄 |
|---|---|---|
| ① | **보안** | AI Tool 앞단의 안전 게이트. 원문 HR Data/Knowledge는 공통 AI Platform에 올리지 않음. |
| ② | **축적** | Light user가 RAG/DB를 직접 관리하지 않아도 Work Card 사용 흔적이 자산 데이터로 누적. |
| ③ | **권한** | 조직×도메인 권한 단위로 DW, 표준 데이터, 자산 데이터 접근을 필요한 만큼만 허용. |

세 가지가 합쳐져야 HR AX Platform을 별도로 운영할 정당성이 생긴다. 핵심은 기존 PPT 2장을 전면 재편하는 것이 아니라, 기존 통합 플랫폼 구상에 HR 데이터 특성상 필요한 보안 게이트·축적·권한 체계를 구체화하는 것이다.

## 왜 이 포지션인가

- 차별점은 모델이 아니다. 챗 UI도 Skill 라이브러리도 아니다. 이 셋은 사외 LLM(Chat GPT / Gemini 등)과 사내 AI Tool이 빠르게 따라올 수 있다.
- 차별점은 **HR 데이터 보안 게이트 + 회사 맥락 축적 + HR 도메인 권한 체계의 단일 책임 부서**라는 위치 자체다.
- 사외 LLM과 공통 AI Tool은 활용 대상이지만, People팀이 정의해야 하는 도메인 정책·민감도 분류·HR 워크플로우는 대신 만들 수 없다.
- HR 담당자는 AI 빌더가 아니다. 사업부/도메인별 RAG를 직접 만들고 로컬 DB를 관리하게 두면 세션 단위로 초기화된다. HR AX는 그 부담을 플랫폼이 흡수한다.

## 문서 인덱스

| 파일 | 용도 |
|---|---|
| [ONE_PAGER.md](./ONE_PAGER.md) | People팀장 / 임원에게 가져갈 1페이지 |
| [POSITIONING.md](./POSITIONING.md) | v3 본문, 안전 게이트·축적·권한 상세, 한 장 아키텍처, 데모 시나리오 3종 |
| [CONTEXT.md](./CONTEXT.md) | 사외 LLM/사내 AI Tool 활용 환경, GAUSS vs 사외 LLM, AX팀 vs People팀 영역 |
| [PLAN.md](./PLAN.md) | 11월까지 코드·정치 트랙 병렬 시퀀스, P0~P2 백로그, 성공 지표 |
| [DECISIONS.md](./DECISIONS.md) | v1 → v2 → v2.1 → v3 진화 이력, 부서원 대안 평가 |
| [TERMINOLOGY.md](./TERMINOLOGY.md) | Agent/Skill/Tool, 보안·축적·권한, 조직×도메인 권한 단위 정의 |
| [ASSETS.md](./ASSETS.md) | Process Coaching L4/L5/L6, AXIOM Agentwork 데이터 모델 차용 |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | AI Tool 연계 전 정찰해야 할 외부 정보 |

## 현재 상태 한 눈에

| 트랙 | 상태 |
|---|---|
| Process Coaching AI | 완료. HR 전 도메인 L4/L5/L6 분해 완료. |
| AXIOM | 아이데이션 완료, 코드 미완. v3 Accumulation의 데이터 모델로 흡수. |
| HR 플랫폼 본체 | 11월 빌드 진행 중. 기존 통합 플랫폼 구상을 안전 게이트·축적·권한 관점으로 구체화 필요. |
| 정치 트랙 | 미시작. 5~7월 골든 타임. People팀장+정보보호센터 합의 필요 (둘 다 People팀 내). |
| 분류표 v0 / 분류 Agent / 라우팅 / 마스킹 / Audit | 미착수. 코드 트랙 P0. |

## 다음 결정 사항 (우선순위)

1. People팀장 컨센서스 — `ONE_PAGER.md`로 시작
2. 정보보호센터 카운터파트 지정 → 분류표 v0 합의 시작
3. AX팀 영역 분리 합의 (`OPEN_QUESTIONS.md` Q1.3, Q1.4)
4. 부서 내 부서원 가설과 정렬 (DECISIONS.md 3.5)
