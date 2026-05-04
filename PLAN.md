# 11월까지 Plan

> 코드 트랙과 정치 트랙 병렬. 정치가 코드보다 먼저 출발해야 한다.
> 정치가 받쳐주면 진짜 차별 플랫폼, 안 받쳐주면 또 하나의 사내 챗 도구.

---

## 1. 두 트랙 타임라인

```
            5월        6월        7월               11월
            │          │          │                 │
정치 트랙   ●──────────●═════════● │                │
            정책 초안   부서 합의   엔터프라이즈     │
                                   도래(골든 끝)    │
                                                     │
코드 트랙   ●──────────●─────────●────────────────●
            P0 분류표  P0 라우팅   P1 Accumulation  11월 출시
                       +마스킹     파이프라인
                       +Audit
```

## 2. 정치 트랙 (병렬, 우선)

### 2.1 P0 — 5~6월

- [ ] **강제 정책 초안 v0**
  - 범위: HR 데이터 처리 시 우리 플랫폼 통과 필수. 단순 일반 질의는 제외.
  - 경계는 분류표 v0가 정의.
  - 첫 협의 자료 프레이밍: "엔터프라이즈 직접 사용 시 발생할 데이터 누수 위험을 HR 플랫폼이 사전 분류로 차단".
  - 산출물: `private/policy/mandate-v0.md` (외부 미공개)

- [ ] **민감도 분류표 v0**
  - HR 도메인 데이터 카테고리별 민감도 등급 (Low / Med / High)
  - People팀 + 정보보호센터 + 노무 일치 필요
  - v0는 좁게 시작 → 운영하며 확장
  - 산출물: `private/policy/sensitivity-v0.yaml`

- [ ] **People팀장 컨센서스 확보**
  - 가져갈 자료: [ONE_PAGER.md](./ONE_PAGER.md) + 7월 도래 시 위험 시나리오 + v3 정당성
  - 결과 목표: v3 방향성 승인 + 정보보호센터 카운터파트 지정

### 2.2 P1 — 6~7월

- [ ] **정보보호센터 동의** — People팀 내부라 정치적 가능성 높음. 강제 정책 보안 정당성 확보.
- [ ] **AX팀과 영역 분리 합의** — "AX팀 인프라 위에 우리 도메인 정책" 프레임. AI Gateway는 AX팀 영역으로 인정.
- [ ] **노무팀 사전 협의** — 자산 누적이 "감시 도구"로 비치지 않게 동의·투명성 메커니즘 설명.
- [ ] **법무 사전 검토** — HR 데이터 처리 강제의 법적 근거 정리.

### 2.3 P2 — 7월 이후

- [ ] **강제 정책 발효** — 엔터프라이즈 도래 직후 즉시. 늦으면 사용자 우회 학습.
- [ ] **CISO/보안위원회 공식 승인** — 강제 정책 공식 문서화.

## 3. 코드 트랙

### 3.1 P0 — 5~7월 (Routing 레이어)

- [ ] **(가) 분류표 v0 데이터화**
  - 정치 트랙의 yaml을 코드에서 사용 가능한 구조로 (loader + cache)
  - 카테고리, 등급, 패턴 정의
  - 산출물: `src/policies/sensitivity/loader.ts`, schema test

- [ ] **(나) 라우팅 엔진 v0**
  - 입력: 사용자 요청 + Work Card 컨텍스트 + 분류 결과
  - 출력: 모델 선택 (Gauss / 엔터프라이즈 / 마스킹+엔터프라이즈), 변환 지시
  - BYOM 인터페이스 추상화 — 모델 슬롯 교체 가능
  - 산출물: `src/routing/router.ts`, `src/routing/byom-adapter.ts`

- [ ] **(다) 마스킹/익명화 변환기**
  - 별표 셀(중간 민감 + 복잡 추론)에서 사용
  - 임직원 식별자 → 익명 ID, 부서명 → 일반화, 금액 → 범위
  - 변환 정책도 People팀 합의 자산
  - 산출물: `src/routing/masking.ts`, `private/policy/masking-v0.yaml`

- [ ] **(라) Application-side Audit Log**
  - 모든 LLM 호출의 정책 결정 / 입력 / 출력 / 근거 기록
  - Gauss든 엔터프라이즈든 동일하게
  - 7월 보안 합의의 핵심 근거
  - 산출물: `src/audit/logger.ts`, `audit_logs` 테이블

### 3.2 P1 — 7~9월 (Accumulation 파이프라인)

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

### 3.3 P2 — 9~11월 (출시 준비)

- [ ] **Phase 5: Trust Tier Promotion** — team / standard asset 분리. Agent는 reviewed 이상만 사용.
- [ ] **Workflow Orchestration v1** — L4/L5/L6 자산 위 다단계 흐름. 결재/승인 라인 시각화.
- [ ] **UX — 부드러운 강제** — 콜드 스타트가 채팅창이 아니라 "내 Work Card + 회사 컨텍스트". 사용자가 Skill 단어 모른 채 일 끝낼 수 있게.
- [ ] **데모 시나리오 3종 완성** — [POSITIONING.md](./POSITIONING.md) 4절 시나리오 A/B/C 동작.

## 4. 의사결정 필터

빌드 중 모든 기능에 적용:

1. 이 기능, Claude Enterprise / Gemini / Custom GPT로도 동일 가능? → Yes면 위에 Mandate/Routing/Accumulation 중 하나가 얹혀야 함.
2. 이 기능, 사용자가 Skill/Agent/Tool 단어를 알아야 동작? → Yes면 UX 재설계.
3. 이 기능이 자산 누적을 만드는가? → No면 우선순위 낮춤.

## 5. 성공 지표 (Success Metrics)

11월 출시 시점 측정:

| 카테고리 | 지표 | 목표 |
|---|---|---|
| **Mandate** | 강제 정책 공식 발효 | 7월 발효 |
| **Mandate** | People팀 LLM 호출 중 우리 플랫폼 비중 | 출시 후 1개월 내 70% 이상 |
| **Routing** | 라우팅 분류 정확도 (민감 → Gauss false negative) | < 1% |
| **Routing** | 별표 셀 내 마스킹 후 엔터프라이즈 활용 비율 | 측정 시작 |
| **Accumulation** | Tacit Candidate 추출 / 작업 카드 비율 | 평균 0.5개 이상 |
| **Accumulation** | Review Queue 통과 후 자산 승급 / 주 | 측정 시작 |
| **Audit** | 모든 LLM 호출 audit log 누락률 | 0% |
| **차별 인식** | "Claude Enterprise와 무엇이 다른가" 질문에 30초 답변 가능 비율 | 100% (출시팀 기준) |

## 6. Go / No-Go 결정점

각 시점에 Go/No-Go 판단. No면 v3.1 (강제 약화 + UX 강화) 또는 v4 (재설계) 검토.

| 시점 | Go 조건 | No이면 |
|---|---|---|
| **6월 말** | 분류표 v0 합의 + People팀장 승인 | 정책 합의 트랙 가속 또는 강제 → 강한 권장으로 약화 |
| **7월 초** | 정보보호센터 + AX팀 영역 분리 합의 | 7월 발효 연기. 코드 트랙 단독 진행. |
| **9월 말** | 분류·라우팅·마스킹·Audit 동작 | 11월 출시 범위 축소 (Accumulation 일부 미루기) |
| **10월 말** | 데모 시나리오 3종 동작 | 출시 연기 또는 시나리오 1종으로 축소 |

## 7. 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| 정치 트랙 6월까지 안 풀림 | v3.1로 약화 (강제 → 강한 권장 + 압도적 UX). Mandate 약화하지만 다른 두 메커니즘 유지. |
| AX팀이 자체 게이트웨이에 HR 정책까지 넣겠다고 함 | "도메인 정책은 People팀 책임" 영역 분리 재확인. Policy API 인터페이스로 위임 받는 형태로 협상. |
| Gauss 성능이 너무 떨어져 별표 셀 거의 전부 마스킹+엔터프라이즈로 감 | 정책 자산 가치 자체는 유효. "Gauss 성능 개선이 곧 우리 가치 증가"라는 동맹 관계로 Gauss 운영팀과 연계. |
| 동료가 Skill 기반 가설 고집 | 부서 분열 방지. 두 안 비교 자료를 People팀장에게 제출하여 결정 받기. |
| 사용자 베이스 콜드스타트 (강제만으론 형식적 사용) | UX P0 강화. 첫 데모에서 "어차피 더 편하다" 증명. 자산 누적 메커니즘으로 "쓸수록 좋아짐" 시각화. |
| 분류기 false negative (민감 → 비민감 오분류) | 분류기를 보수적으로 (의심스러우면 Gauss). 사후 audit으로 오분류 감지 → 분류표 갱신 루프. |

## 8. 11월 출시물의 한 줄 정의 (목표)

> "L4/L5/L6 프로세스 자산 위에 깔린 HR Work Card 운영면. 사용자 작업이 들어오면 분류·라우팅·마스킹을 거쳐 적절한 LLM(Gauss 또는 엔터프라이즈)으로 보내고, 결과는 Tacit Candidate 추출 + Review Queue를 통해 회사 자산으로 누적된다. 모든 호출은 application-side audit으로 추적된다."

이 문장이 출시 후 People팀장이 외부에 한 줄로 설명할 수 있어야 v3 성공.
