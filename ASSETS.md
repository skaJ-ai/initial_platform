# Assets — 가용 자산 목록

> v3 빌드 시 활용 가능한 기존 자산. 이미 만들어둔 것을 다시 만들지 않는다.

---

## 1. Process Coaching AI

**위치**: `C:\dev\HR-Process-Coaching-AI` 등 다중 트리

**상태**: 완료. HR 전 도메인 L4/L5/L6 분해 완료.

**형태**: JSON, 사내망 내부, 반출 불가.

**v3 활용**:
- L4/L5/L6 트리 = Agent의 정의 공간
- 각 L6 노드에서 표준 Skill md 자동 생성 가능
- Workflow Orchestration의 다단계 흐름 정의 입력
- 분류표 v0의 도메인 카테고리 입력

**관련 도구**:
- L7 룰 엔진 (`structRules.ts`, `l7Rules.ts`) — 라벨/구조 검증, LLM 무관 항상 동작
- 3단계 폴백 체인 (`chat_orchestrator.py`) — LLM → Rule Coach → Mock
- L345 참조 데이터 — 6 L3, 40+ L4, 100+ L5

## 2. AXIOM — Agentwork.md 데이터 모델

**위치**: `C:\dev\AXIOM\Agentwork.md`

**상태**: 설계 완료, 코드 미완 (위키 대비 구현 ~20%)

**v3 활용**: Accumulation 메커니즘의 데이터 모델 그대로 차용.

### 차용할 테이블 5종

```sql
work_cards
  - id, workspace_id, owner_user_id, process_asset_id
  - title, description, domain_l3, status, priority
  - audience, sensitivity, current_step_id
  - created_at, updated_at

tacit_candidates
  - id, work_card_id, session_id, source_message_id
  - statement, reason, speaker_type, speaker_id
  - captured_from, confidence, review_status
  - created_at

knowledge_context_tags
  - id, candidate_id, tag_type, tag_value

knowledge_review_queue
  - id, candidate_id, reviewer_id
  - decision, resolution_type, target_asset_id
  - comment, reviewed_at

standard_assets
  - id, source_candidate_id, asset_level
  - bucket_scope, approval_chain_id, status
```

### 차용할 워크플로

```
사람 흐름:
1. Work Card 생성
2. Process Asset 연결
3. Copilot과 대화
4. 시스템이 Tacit Candidate 추출
5. Context Tag 부착, Review Queue 진입
6. Reviewer 검수
7. 통과 시 Team / Standard Asset 승격
8. 다음 카드의 retrieval 대상

충돌 해결:
- fact conflict → 사실 오류 제거
- context mismatch → 분리 보존
- same-context policy conflict → 사람 승인
```

### 차용할 Trust Tier

```
1. raw conversation signal
2. tacit candidate
3. reviewed working knowledge
4. team asset
5. verified standard asset
```

Agent는 최소 reviewed 이상만 사용.

### 차용할 구현 순서 (Agentwork Phase 0~7)

| Phase | 내용 | v3 P 매핑 |
|---|---|---|
| 0 | work_cards 최소 스키마, sessions 연결 | P1 |
| 1 | work card 도입, tacit_candidates 저장 | P1 |
| 2 | tacit candidate 추출 고도화 | P1 |
| 3 | context tag 모델 | P1 |
| 4 | review queue, conflict flagging | P1 |
| 5 | trust tier promotion | P2 |
| 6 | retrieval 개선 | P2 |
| 7 | selective agent execution | 출시 후 |

## 3. AXIOM — Copilot UX 자산

**위치**: `C:\dev\AXIOM\` 코드 트리

**상태**: 베타 수준. positioning.md 자체평가에 따르면 "Copilot 베타".

**v3 활용**:
- 4모드 대화 인프라 → v3의 Copilot 실행 레이어
- 세션 / 캔버스 → Work Card 위 실행 단위로 재조정
- Knowledge pipeline → Tacit Capture로 확장
- memory chunk retrieval → Trust Tier 필터 추가

## 4. process-coaching CLAUDE.md — Process 강제 규약

**위치**: `C:\dev\process-coaching\CLAUDE.md`

**내용**: 4단계 프로세스 (PLAN → CONTEXT → CHECKLIST → 자가점검 → 교차리뷰)

**v3 활용**: 본 initial_platform 빌드에도 동일 규약 적용 권고. PLAN.md, CONTEXT.md, CHECKLIST.md 강제 생성 + 사용자 승인 후 진행.

## 5. AXIOM/CLAUDE.md — Front Guard 컨벤션

**위치**: `C:\dev\AXIOM\CLAUDE.md`

**내용**: Naming, Import order, Idempotency rules, Component patterns, Back Guard self-evaluation

**v3 활용**: HR 플랫폼 본체 빌드 시 이 컨벤션 적용. 멱등성 규칙은 LLM 출력의 일관성 확보.

## 6. 부서원 작업물 — Agent/Skill/Tool 모듈

**상태**: 구체화 진행 중

**v3 활용**: Agent/Skill/Tool 3계층 정의 그대로 사용. 부서원의 모듈화 사고는 v3 실행 레이어의 단단한 기반.

## 7. 미보유 — 새로 만들어야 할 자산

| 자산 | 필요 시점 | 만들 주체 |
|---|---|---|
| 분류표 v0 (HR 도메인 민감도) | 5~6월 | People팀 + 정보보호센터 |
| 라우팅 정책 (별표 셀 결정 룰) | 6~7월 | People팀 |
| 마스킹/익명화 변환 정책 | 6~7월 | People팀 + 노무 |
| 강제 정책 문서 v0 | 5~6월 | AXN 랩 + People팀장 |
| 응답 audit 스키마 | 7월 | 코드 트랙 |
