# HR AX Platform — Initial Positioning

> 삼성전자 People팀 / AXN 컬쳐이노베이션 랩
> 11월 출시 HR 플랫폼의 정체성·로드맵 1차 정리물
> Status: Draft v3 · Last update: 2026-05-04

---

## 한 줄

**HR 플랫폼은 HR 담당자가 HR 데이터를 다룰 때 거쳐야 하는 단일 진입점이다. 안에서 민감도와 복잡도에 따라 사내 Gauss 또는 사외 엔터프라이즈 LLM으로 자동 라우팅하고, 사용할수록 회사 맥락이 자산으로 누적되어 다음 사용이 더 좋아진다.**

## 3 메커니즘

| | 메커니즘 | 한 줄 |
|---|---|---|
| ① | **Mandate** | HR 데이터 처리 시 우리 플랫폼 강제 통과. 정책의 채찍. |
| ② | **Routing** | 민감도 × 복잡도 매트릭스로 Gauss / 엔터프라이즈 / 마스킹+엔터프라이즈 자동 분기. |
| ③ | **Accumulation** | Work Card → Tacit Candidate → Review Queue → Trust Tier 승급의 자산 누적. |

세 가지가 합쳐져야 작동한다. 하나라도 빠지면 7월 엔터프라이즈 도래 후 차별 인식이 깨진다.

## 왜 이 포지션인가

- 차별점은 모델이 아니다. 챗 UI도 Skill 라이브러리도 아니다. 이 셋은 7월에 들어오는 KODEX/Claude/Gemini Enterprise가 다 한다.
- 차별점은 **HR 데이터 거버넌스 + 회사 맥락 누적의 운영 레이어 + HR 도메인 정책의 단일 책임 부서**라는 위치 자체다.
- 엔터프라이즈는 같은 사내망에 들어오지만 People팀이 정의해야 하는 도메인 정책·민감도 분류·HR 워크플로우는 절대 카피 못 한다.

## 문서 인덱스

| 파일 | 용도 |
|---|---|
| [ONE_PAGER.md](./ONE_PAGER.md) | People팀장 / 임원에게 가져갈 1페이지 |
| [POSITIONING.md](./POSITIONING.md) | v3 본문, 3 메커니즘 상세, 한 장 아키텍처, 데모 시나리오 3종 |
| [CONTEXT.md](./CONTEXT.md) | 7월 엔터프라이즈 도래, Gauss vs 엔터프라이즈, AX팀 vs People팀 영역 |
| [PLAN.md](./PLAN.md) | 11월까지 코드·정치 트랙 병렬 시퀀스, P0~P2 백로그, 성공 지표 |
| [DECISIONS.md](./DECISIONS.md) | v1 → v2 → v2.1 → v3 진화 이력, 부서원 대안 평가 |
| [TERMINOLOGY.md](./TERMINOLOGY.md) | Agent/Skill/Tool, Mandate/Routing/Accumulation 정의 |
| [ASSETS.md](./ASSETS.md) | Process Coaching L4/L5/L6, AXIOM Agentwork 데이터 모델 차용 |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | 7월 전 정찰해야 할 외부 정보 |

## 현재 상태 한 눈에

| 트랙 | 상태 |
|---|---|
| Process Coaching AI | 완료. HR 전 도메인 L4/L5/L6 분해 완료. |
| AXIOM | 아이데이션 완료, 코드 ~20%. v3 Accumulation의 데이터 모델로 흡수. |
| HR 플랫폼 본체 | 11월 빌드 진행 중. 정체성 재정의 필요 (현재 "스킬+툴콜링" → v3 전환). |
| 정치 트랙 | 미시작. 5~7월 골든 타임. People팀장+정보보호센터 합의 필요 (둘 다 People팀 내). |
| 분류표 v0 / 라우팅 / 마스킹 / Audit | 미착수. 코드 트랙 P0. |

## 다음 결정 사항 (우선순위)

1. People팀장 컨센서스 — `ONE_PAGER.md`로 시작
2. 정보보호센터 카운터파트 지정 → 분류표 v0 합의 시작
3. AX팀 영역 분리 합의 (`OPEN_QUESTIONS.md` Q1.3, Q1.4)
4. 부서 내 부서원 가설과 정렬 (DECISIONS.md 3.5)
