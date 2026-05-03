# Positioning v3

> 가설 v1 → v2 → v2.1 → v3 진화 끝의 통합본
> v3 = Mandate + Routing + Accumulation의 합성

---

## 1. 한 줄

> **HR 플랫폼은 HR 담당자가 HR 데이터를 다룰 때 거쳐야 하는 단일 진입점이다. 안에서 민감도/복잡도에 따라 사내 Gauss 또는 사외 엔터프라이즈 LLM으로 자동 라우팅하고, 사용할수록 회사 맥락이 자산으로 누적되어 다음 사용이 더 좋아진다.**

## 2. 한 장 아키텍처

```
─────────────────────────────────────────────────────────────────
[사용자 = HR 담당자]
       │
       │ HR 데이터 처리 시 강제 진입 (Mandate)
       ▼
─────────────────────────────────────────────────────────────────
[운영 레이어 — People팀의 단일 책임 영역]
   ├─ Authorization & Audit  ─ 누가/언제/무엇을, application-side log
   ├─ Sensitivity Classifier ─ HR 도메인 민감도 분류 (분류표 v0)
   ├─ Routing Policy         ─ 민감도 × 복잡도 매트릭스 기반 분기
   ├─ Masking / Anonymization ─ 마스킹 후 엔터프라이즈 호출 가능 셀
   └─ Workflow Orchestration ─ L4/L5/L6 자산 위 다단계 흐름
─────────────────────────────────────────────────────────────────
[실행 레이어 — Agent / Skill / Tool]
   ├─ Agent  : L5/L6 단위 실행체 (Process Coaching 자산 활용)
   ├─ Skill  : 노하우 md (versioned + scoped + reviewed)
   └─ Tool   : 코드 동작 (임직원 조회, 계산기, 출장비 계산 등)
─────────────────────────────────────────────────────────────────
[모델 슬롯 — BYOM]
   ├─ Gauss (사내 sLM)         ← 민감/극민감 데이터
   └─ KODEX / Claude / Gemini  ← 비민감 / 마스킹 후 / 복잡 추론
─────────────────────────────────────────────────────────────────
       │
       ▼
[자산 누적 (Accumulation)]
   사용 → Tacit Candidate 추출 → Context Tagging →
   Review Queue → Trust Tier 승급 → 다음 사용의 출발점
─────────────────────────────────────────────────────────────────
```

## 3. 3개 메커니즘 상세

### 3.1 Mandate — 강제 단일 진입점

**원칙.** HR 담당자가 HR 데이터(임직원 정보, 평가, 보상, 인사위 등)를 처리하는 모든 행위는 우리 플랫폼을 통과해야 한다. 단순 일반 질의(번역, 문서 요약, 일반 정보 검색 등)는 제외.

**왜 강제가 필요한가.**

- 강제 없으면 사용자가 직접 사외 엔터프라이즈 LLM으로 가버린다. 콜드 스타트 문제 영원히 못 푼다.
- 자유 사용 시 임직원 개인정보가 사외 LLM 컨텍스트에 그대로 올라갈 수 있음 → 보안 사고.
- 강제는 사용자 베이스 확보의 채찍 + 보안/CISO 동맹의 정당성을 동시에 만든다.

**경계 정의.** 강제 범위는 분류표 v0가 정의한다. 강제 정책 발효 전에 분류표가 합의돼야 한다.

**부드러운 강제.** 채찍만으로는 우회를 부른다. UX가 충분히 좋아서 "어차피 더 편하다"가 돼야 진짜 작동한다. 첫 데모에서 이걸 증명해야 정책이 살아남는다.

### 3.2 Routing — 민감도 × 복잡도 매트릭스

**1축이 아니라 2축.** Gauss는 데이터 주권 강하지만 성능 약하고, 엔터프라이즈는 성능 강하지만 데이터 위험 있다. 두 축을 같이 봐야 셀별 trade-off 결정 가능.

```
                작업 복잡도 →
                Low          Medium         High
민감도  Low   [Gauss OK]    [Gauss OK]    [Enterprise]
   ↓    Med   [Gauss]       [정책]        [정책 ★]
        High  [Gauss]       [Gauss]       [Gauss + 성능 손해]
```

**별표(★) 셀이 People팀 정책의 핵심 자리.** "중간 민감 + 복잡 추론" 셀에서:
- 그대로 엔터프라이즈로? → 보안 위험
- Gauss로? → 답 품질 손실
- **마스킹/익명화 후 엔터프라이즈로** → 정책으로 가능
- **요약/추상화해서 엔터프라이즈로** → 정책으로 가능
- **분리 호출 (일부만 엔터프라이즈)** → 정책으로 가능

이 셀의 결정은 도메인 지식 없으면 못 한다. AX팀, 벤더, 일반 AI Gateway 다 못 한다. **People팀만 가능.**

### 3.3 Accumulation — 자산 누적 파이프라인

**핵심 통찰 (`AXIOM/Agentwork.md` 인용).**
> "HR AX의 moat는 대화가 많아서가 아니다. 문서가 많아서가 아니다. **업무 카드 위에서 포착된 판단 기준이 검토를 거쳐 재사용 자산으로 승격되는 구조**에서 생긴다."

**파이프라인.**

```
사용자 작업 (Work Card)
    ↓ Copilot과 대화 진행
    ↓ Tacit Candidate 추출 (서버 측 intent capture)
    ↓ Context Tag 부착 (audience, sensitivity, exception 등)
    ↓ Review Queue 진입
    ↓ Reviewer 검수 (fact_rejected / context_split / approved_team / approved_standard / merged)
    ↓ Trust Tier 승급
    ↓ 다음 Work Card의 검색 대상 / Agent 활용 자산
```

**Trust Tier.** raw signal → tacit candidate → reviewed working knowledge → team asset → verified standard asset. Agent는 최소 reviewed 이상만 사용.

**핵심 비목표.** raw chat 전체를 자동 승격하지 않는다. 모든 신호가 자산이 되지 않는다. 사람의 검수가 들어가는 게 핵심.

## 4. 차별 후보 5가지 평가

| # | 후보 | 강도 | 근거 |
|---|---|---|---|
| 1 | 민감도 기반 LLM 라우팅 | 강 | HR 도메인 분류기는 People팀만 정의 가능. AI Gateway 인프라는 AX팀 영역, 정책은 우리 영역. |
| 2 | 다단계 워크플로우 오케스트레이션 | 강 | 엔터프라이즈는 단발 챗에 강함, 다단계 묶음에 약함. L4/L5/L6 자산 위에서만 가능. |
| 3 | HR 도메인 권한·승인 정책 | 중강 | 일반 RBAC가 아닌 HR 특수 룰 ("본인 평가 미공개 기간엔 본인도 못 봄"). |
| 4 | 사내 HR 시스템 깊은 연동 | 중 | 인사정보/평가/결재 시스템 도메인 특화 connector. |
| 5 | HR 도메인 특화 UX | 약 | 단독 moat 아님. 1~4와 결합 시 가시화. |

**1, 2가 본체. 3은 보완. 4, 5는 부가.**

## 5. 강조점 — 절대 잊지 말 것

### 5.1 7월 엔터프라이즈와 정면 대결을 피해야 한다

빌드 중인 모든 기능에 다음 필터를 적용한다:

> "이 기능, Claude Enterprise / Gemini Enterprise / Custom GPT로도 동일하게 가능한가?"

Yes면 차별 못 만든다. 그 기능 자체로는 안 되고, 위에 Mandate/Routing/Accumulation 중 하나가 얹혀야 차별이 생긴다.

### 5.2 Mandate의 정당성을 끊임없이 강조해야 한다

"Skill이 모여 있어서 편함"은 강제 정당성으로 약하다. 정당성은 다음에서만 나온다:
- HR 데이터 거버넌스 (외부 누수 위험 차단)
- 회사 맥락 누적 (회사 자산화)
- HR 도메인 정책의 단일 책임 부서

이 셋을 People팀장, 정보보호센터, 보안, AX팀에 일관되게 강조해야 정책 합의 가능.

### 5.3 자산 누적이 가장 큰 moat다

`AXIOM/Agentwork.md`의 Work Card / Tacit Candidate / Context Tag / Review Queue / Trust Tier 5종 데이터 모델이 v3의 Accumulation 메커니즘과 정확히 일치한다. **이 설계를 차용해서 11월 빌드 P0의 일부로 가져간다.**

엔터프라이즈가 카피 못 하는 본질이 여기 있다. 시간이 갈수록 강해지는 유일한 메커니즘.

## 6. 비교표 — Before vs After

| 항목 | Before (현재 빌드 방향) | After (v3) |
|---|---|---|
| 한 줄 정체성 | "스킬+툴콜링+외부 LLM API 챗 플랫폼" | "HR 데이터 거버넌스+자산 누적 운영 레이어" |
| 콜드 스타트 | 빈 채팅창 | 내 Work Card + 회사 컨텍스트 |
| 모델 | 외부 LLM 직결 | BYOM 슬롯 (Gauss/엔터프라이즈 자동 분기) |
| 강제 정당성 | 없음 | 데이터 거버넌스 |
| 자산화 | 없음 | Tacit Candidate → Review → Trust Tier |
| 7월 엔터프라이즈 도래 후 | 정면 충돌 → 깨짐 | 보완 레이어 → 위에 얹힘 |
| 시간이 흐를수록 | 약화 (엔터프라이즈에 밀림) | 강화 (자산 누적) |
