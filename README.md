# HR AX Platform — Initial Positioning & Plan

> 삼성전자 People팀 / AXN 컬쳐이노베이션 랩
> 11월 출시 목표 HR 플랫폼의 재포지셔닝, 외부 환경, 11월까지 빌드/정치 트랙 정리
> 작성: 2026-05-03 대화 기반 초안

---

## 한 줄 포지셔닝 (v3)

> **HR 플랫폼은 HR 담당자가 HR 데이터를 다룰 때 거쳐야 하는 단일 진입점이다. 안에서 민감도/복잡도에 따라 사내 Gauss 또는 사외 엔터프라이즈 LLM으로 자동 라우팅하고, 사용할수록 회사 맥락이 자산으로 누적되어 다음 사용이 더 좋아진다.**

## 3개 메커니즘

| | 메커니즘 | 역할 |
|---|---|---|
| ① | **Mandate** | HR 데이터 처리 시 우리 플랫폼 강제 통과. 정책의 채찍. |
| ② | **Routing** | 민감도/복잡도 매트릭스 기반 Gauss / 엔터프라이즈 / 마스킹+엔터프라이즈 자동 분기. |
| ③ | **Accumulation** | 사용 흔적이 자산으로 누적 (Work Card → Tacit Candidate → Review Queue → Trust Tier). |

세 가지가 합쳐져야 작동한다. 하나라도 빠지면 7월 엔터프라이즈 도래 후 깨진다.

## 왜 이 포지션인가 (한 줄 요약)

- **차별점은 모델도 챗 UI도 Skill 라이브러리도 아니다.** 이 셋은 7월에 들어오는 KODEX/Claude/Gemini Enterprise가 다 한다.
- 차별점은 **HR 데이터 거버넌스 + 회사 맥락 누적의 운영 레이어 + HR 도메인 정책의 단일 책임 부서**라는 위치 자체다.
- 엔터프라이즈는 같은 사내망에 들어오지만 People팀이 정의해야 하는 도메인 정책·민감도 분류·HR 워크플로우는 절대 카피 못 한다.

## 문서 인덱스

- [POSITIONING.md](./POSITIONING.md) — v3 본문, 3개 메커니즘 상세, 한 장 아키텍처, 차별 후보 평가
- [CONTEXT.md](./CONTEXT.md) — 7월 엔터프라이즈 도래, Gauss vs 엔터프라이즈, AX팀 vs People팀 영역 분리
- [PLAN.md](./PLAN.md) — 11월까지 코드 트랙 + 정치 트랙 병렬 시퀀스, P0 백로그
- [DECISIONS.md](./DECISIONS.md) — 가설 진화 이력 (v1 → v2 → v2.1 → v3), 부서원 대안 평가
- [TERMINOLOGY.md](./TERMINOLOGY.md) — Agent / Skill / Tool 정의 및 사용 원칙
- [ASSETS.md](./ASSETS.md) — Process Coaching L4/L5/L6, AXIOM Agentwork 데이터 모델 등 가용 자산
- [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) — 7월 전 정찰해야 할 항목

## 현재 상태

- Process Coaching AI: 완료. HR 전 도메인 L4/L5/L6 분해 완료 (JSON, 사내망, 반출 불가)
- AXIOM: 아이데이션 단계. v3의 Accumulation 메커니즘 설계는 `AXIOM/Agentwork.md`에 이미 구체화됨 — 차용 권고
- HR 플랫폼 본체: 11월 빌드 진행 중. 정체성 재정의 필요 (현재 "스킬+툴콜링+외부 LLM" → v3로 재포지셔닝)
- 정치 트랙: 미시작. 6~7월 골든 타임에 People팀장 + 정보보호센터 합의 필요 (둘 다 People팀 내 → 정치적 가능)
