/**
 * HR AX Platform — MVP Demo App Logic (Shell)
 *
 * UI 라우팅, 카드 선택, 자동 조립 시각화, 채팅 흐름.
 * 실제 LLM 호출은 llm-client.js 스텁 사용 (sample 응답).
 *
 * TODO (다음 LLM):
 *  - 실제 LLM 호출 연결 (llm-client.js의 chat 메서드 구현 후)
 *  - 카드 종료 시 검수 후보 추출 흐름
 *  - 검수 큐 UI (별도 화면)
 *  - 분류 결과 시각화 (실제 분류 Agent 호출 결과 표시)
 */

const HRAX_CURRENT_USER = window.HRAX_DATA.CURRENT_USER;
const HRAX_SCENARIOS = window.HRAX_DATA.SCENARIOS;
const HRAX_DOMAINS = window.HRAX_DATA.DOMAINS;
const HRAX_PROCESS_CATALOG = window.HRAX_DATA.PROCESS_CATALOG;

let currentView = 'workspace';
let currentCardId = null;
let currentEntryMode = 'guided';
let conversationHistory = [];

const DOMAIN_CODES = {
  교육: 'ED',
  노사: 'LR',
  '보상·근태': 'CP',
  인력운영: 'WF',
  임원조직: 'EX',
  제도: 'SY',
  채용: 'RC',
  총무: 'GS',
  해외인사: 'GL',
  DEI: 'DE',
  조직문화: 'CU',
  집단지성: 'CI'
};

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();
  renderSidebar();
  renderWorkspace();
  bindGlobalEvents();
  updateEndpointStatus();
});

// ── TOPBAR ──
function renderTopbar() {
  document.getElementById('user-chip').textContent = `${HRAX_CURRENT_USER.name} · ${HRAX_CURRENT_USER.role}`;
  document.getElementById('breadcrumb').textContent = HRAX_CURRENT_USER.workspace;
}

// ── SIDEBAR ──
function renderSidebar() {
  const allCount = HRAX_SCENARIOS.length;
  const guidedCount = HRAX_SCENARIOS.filter(s => s.entryMode === 'guided').length;
  const openCount = HRAX_SCENARIOS.filter(s => s.entryMode === 'open').length;
  const accessDomains = HRAX_CURRENT_USER.domains || HRAX_DOMAINS.filter(d => d.count > 0).map(d => d.name);

  const html = `
    <div class="sidebar-logo">
      <div class="brand-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="9" height="9" rx="2" fill="white" opacity="0.9"/>
          <rect x="14" y="3" width="9" height="9" rx="2" fill="white" opacity="0.55"/>
          <rect x="3" y="14" width="9" height="9" rx="2" fill="white" opacity="0.55"/>
          <rect x="14" y="14" width="9" height="9" rx="2" fill="white" opacity="0.25"/>
        </svg>
      </div>
      <div>
        <div class="logo-name">HR AX Platform</div>
        <div class="logo-sub">AI Native 작업공간</div>
      </div>
    </div>

    <div class="section-title">Entry Mode</div>
    <a class="nav-item active" data-mode="guided">
      <span class="nav-code">GW</span>
      <span>Guided Work</span>
      <span class="count">${guidedCount}</span>
    </a>
    <a class="nav-item" data-mode="open">
      <span class="nav-code">OC</span>
      <span>Open Chat</span>
      <span class="count">${openCount}</span>
    </a>

    <div class="section-title">My Work-space</div>
    <a class="nav-item" data-mode="all">
      <span class="nav-code">ALL</span>
      <span>전체 추천</span>
      <span class="count">${allCount}</span>
    </a>

    <div class="scope-card">
      <div class="scope-label">로그인 기반 권한</div>
      <strong>${HRAX_CURRENT_USER.org || HRAX_CURRENT_USER.role}</strong>
      <div class="scope-tags">
        ${accessDomains.map(name => `<span>${name}</span>`).join('')}
      </div>
      <p>${HRAX_PROCESS_CATALOG.totalL6Label} 중 권한·최근 업무·입력 의도 기반 후보만 노출합니다.</p>
    </div>

    <div class="section-title">관리</div>
    <a class="nav-item" data-view="review-queue">
      <span class="nav-code">RV</span>
      <span>검수 큐</span>
      <span class="count">0</span>
    </a>
    <a class="nav-item" data-view="audit-log">
      <span class="nav-code">AU</span>
      <span>감사 로그</span>
    </a>
  `;
  document.getElementById('sidebar').innerHTML = html;

  // Bind mode clicks
  document.querySelectorAll('.sidebar .nav-item[data-mode]').forEach(el => {
    el.addEventListener('click', e => {
      document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      currentEntryMode = el.dataset.mode;
      renderWorkspace(currentEntryMode);
    });
  });

  document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(el => {
    el.addEventListener('click', e => {
      document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      const view = el.dataset.view;
      // TODO: 다음 LLM이 review-queue / audit-log 화면 구현
      alert(`[껍데기 모드] '${view}' 화면은 다음 LLM이 구현해야 합니다. BUILD_SPEC.md 참조.`);
    });
  });
}

// ── WORKSPACE (카드 그리드) ──
function renderWorkspace(mode = currentEntryMode) {
  currentView = 'workspace';
  currentCardId = null;
  currentEntryMode = mode || 'guided';

  const cards = HRAX_SCENARIOS.filter(s => {
    return currentEntryMode === 'all' || s.entryMode === currentEntryMode;
  });

  const modeTitle = currentEntryMode === 'open'
    ? 'Open Chat Mode'
    : currentEntryMode === 'all'
      ? '전체 추천'
      : 'Guided Work Mode';
  const modeDescription = currentEntryMode === 'open'
    ? '완전 채팅창에서 시작하되, 플랫폼이 뒤에서 업무 의도와 L3-L6 후보를 추정합니다.'
    : currentEntryMode === 'all'
      ? '권한 범위 안에서 Guided Work와 Open Chat 예시를 함께 봅니다.'
      : '로그인 권한과 반복 업무 패턴을 기준으로 플랫폼이 Work Card와 L6 후보를 먼저 제안합니다.';

  const main = document.getElementById('main');
  main.innerHTML = `
    <h1>
      ${HRAX_CURRENT_USER.workspace}
      <span class="lead">${HRAX_CURRENT_USER.permissionUnit} · ${modeTitle} · 추천 ${cards.length}개</span>
    </h1>
    <div class="mode-summary">
      <div>
        <span class="section-label">Entry Strategy</span>
        <h2>${modeTitle}</h2>
        <p>${modeDescription}</p>
      </div>
      <div class="mode-kpi">
        <strong>${HRAX_PROCESS_CATALOG.totalL6Label}</strong>
        <span>사용자가 직접 고르지 않고, 플랫폼이 후보를 제안</span>
      </div>
    </div>
    ${currentEntryMode === 'open' ? renderOpenChatSurface() : ''}
    <div class="workspace-toolbar">
      <span class="section-label">${currentEntryMode === 'open' ? 'Suggested Follow-up' : 'Recommended Work Cards'}</span>
      <span class="meta">L3-L6 후보 · 라우팅 · 조립 · 자산화 시연</span>
    </div>
    ${cards.length > 0 ? `
      <div class="card-grid">
        ${cards.map(card => renderCardThumb(card)).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-title">표시할 카드가 없습니다</div>
        <p>선택한 필터 또는 도메인에 해당하는 시나리오 카드가 없습니다.</p>
      </div>
    `}
  `;

  bindOpenChatSurface(main);

  // Bind card clicks
  main.querySelectorAll('.work-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.cardId;
      openCard(id);
    });
  });

  // Hide chat panel when not in card view
  document.getElementById('panel-right').classList.add('hidden');
}

function renderCardThumb(card) {
  return `
    <div class="work-card" data-card-id="${card.id}">
      <div class="card-tags">
        <span class="tag ${card.type}">${card.entryMode === 'open' ? 'Open Chat' : 'Guided'}</span>
        <span class="tag ${card.grade}">${gradeLabel(card.grade)}</span>
        <span class="tag">${card.domain}</span>
      </div>
      <div class="card-title">${card.title}</div>
      <div class="card-desc">${card.description}</div>
      ${card.processMeta ? `
        <div class="process-map">
          <span>${card.processMeta.l4}</span>
          <span>${card.processMeta.l5}</span>
          <strong>${card.processMeta.l6}</strong>
        </div>
      ` : ''}
      <div class="card-footer">
        <span>${card.process || 'Open Chat 일감'}</span>
        <span class="card-open">OPEN</span>
      </div>
    </div>
  `;
}

function renderOpenChatSurface() {
  return `
    <div class="open-chat-surface">
      <div>
        <span class="section-label">Open Chat</span>
        <h2>채팅으로 먼저 시작</h2>
        <p>도메인이나 L6를 직접 고르지 않아도 됩니다. 입력 내용을 기준으로 플랫폼이 권한 범위 안의 L3-L6 후보를 제안하고, 필요한 경우 Guided Work로 전환합니다.</p>
      </div>
      <div class="open-chat-box">
        <textarea id="open-chat-intent" rows="3" placeholder="예: 업적평가 결과를 보고서로 정리하고, 조직별 편차 원인과 후속 조치까지 뽑아줘"></textarea>
        <button class="btn primary" id="open-chat-analyze">업무 의도 분석</button>
      </div>
      <div class="candidate-grid" id="open-chat-candidates">
        ${HRAX_PROCESS_CATALOG.openCandidates.map(renderCandidate).join('')}
      </div>
    </div>
  `;
}

function renderCandidate(candidate) {
  return `
    <div class="candidate-card">
      <div class="candidate-score">confidence ${candidate.confidence}</div>
      <strong>${candidate.l6}</strong>
      <span>${candidate.l3} / ${candidate.l4} / ${candidate.l5}</span>
    </div>
  `;
}

function bindOpenChatSurface(root) {
  const button = root.querySelector('#open-chat-analyze');
  const textarea = root.querySelector('#open-chat-intent');
  const target = root.querySelector('#open-chat-candidates');
  if (!button || !textarea || !target) return;
  button.addEventListener('click', () => {
    const text = textarea.value.trim();
    const intro = text
      ? `입력 의도 "${text.slice(0, 48)}${text.length > 48 ? '...' : ''}" 기준 후보`
      : '기본 예시 후보';
    target.innerHTML = `
      <div class="candidate-note">${intro}. 실제 구현에서는 분류 Agent가 권한·민감도·L3-L6 후보를 함께 반환합니다.</div>
      ${HRAX_PROCESS_CATALOG.openCandidates.map(renderCandidate).join('')}
    `;
  });
}

function gradeLabel(g) {
  return { confidential: '기밀', sensitive: '민감', general: '일반' }[g] || g;
}

// ── CARD DETAIL (자동 조립 + 채팅) ──
function openCard(cardId) {
  const card = HRAX_SCENARIOS.find(s => s.id === cardId);
  if (!card) return;

  currentView = 'card-detail';
  currentCardId = cardId;
  conversationHistory = [];

  // Main: 자동 조립 visualization
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="card-detail-header">
      <button class="back" onclick="renderWorkspace()"><span class="btn-code">BK</span>Work-space로 돌아가기</button>
      <h1>${card.title}</h1>
      <div class="meta">
        <span class="tag ${card.type}">${card.entryMode === 'open' ? 'Open Chat' : 'Guided'}</span>
        <span class="tag ${card.grade}">${gradeLabel(card.grade)}</span>
        <span class="tag">${card.domain}</span>
        ${card.process ? `<span class="tag">${card.process}</span>` : ''}
      </div>
    </div>

    ${card.processMeta ? `
      <div class="assembly">
        <div class="assembly-header">
          <h3>L3-L6 자동 후보</h3>
          <span class="auto-badge">${card.processMeta.owner}</span>
        </div>
        <div class="candidate-grid">
          ${renderCandidate({
            l3: card.processMeta.l3,
            l4: card.processMeta.l4,
            l5: card.processMeta.l5,
            l6: card.processMeta.l6,
            confidence: card.entryMode === 'open' ? '0.78' : '0.92'
          })}
          <div class="candidate-card">
            <div class="candidate-score">근거</div>
            <strong>${card.processMeta.reason}</strong>
            <span>사용자는 L6를 직접 선택하지 않고, 필요할 때만 후보를 확인합니다.</span>
          </div>
        </div>
      </div>
    ` : ''}

    <div class="assembly">
      <div class="assembly-header">
        <h3>카드 진입 시 자동 조립</h3>
        <span class="auto-badge">Auto-Assembled</span>
      </div>
      <div class="assembly-grid">
        ${renderAssemblyItem('Agent', card.assembly.agent
          ? `${card.assembly.agent.name} <span class="tag agent">${card.assembly.agent.type}</span>`
          : null,
          card.assembly.agent ? card.assembly.agent.sub : 'Domain Agent 미구축 — Skill·Tool로 처리')}
        ${renderAssemblyItem('Skill',
          card.assembly.skill ? card.assembly.skill.name : null,
          card.assembly.skill ? card.assembly.skill.sub : null)}
        ${renderAssemblyItem('Tool',
          card.assembly.tool && card.assembly.tool.length > 0 ? card.assembly.tool.join(', ') : null,
          card.assembly.tool && card.assembly.tool.length > 0 ? '결정적 코드 동작' : '미부착')}
        ${renderAssemblyItem('Context',
          card.assembly.context.join(', '),
          'HR 맥락 RAG 자료')}
      </div>
    </div>

    <div class="decision-bar hidden" id="decision-bar">
      <div class="label">결정 한 줄</div>
      <input type="text" id="decision-input" placeholder="예: OO 사유로 보류" />
      <button class="btn primary" id="finalize-btn">카드 종료 + 자산화</button>
    </div>
  `;

  // Right panel: chat
  const panel = document.getElementById('panel-right');
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="panel-header">
      <h3>대화</h3>
      <div class="endpoint-status ${window.HRAX_LLM.isConfigured() ? 'connected' : ''}" id="endpoint-status-detail">
        <span class="dot"></span>
        <span>${window.HRAX_LLM.isConfigured() ? window.HRAX_LLM.statusLabel() : 'LLM 미설정'}</span>
      </div>
    </div>
    <div class="route-banner ${card.grade}">
      <span class="route-code">RT</span>
      <span>라우팅: ${card.routing.grade} → ${card.routing.model}<br>
      <small>${card.routing.reason}</small>
      </span>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div class="message system">
        자동 조립 완료. 시작하려면 메시지를 입력하세요.
      </div>
    </div>
    <div class="chat-input">
      <textarea id="chat-input-field" rows="2" placeholder="${card.samplePrompt || '메시지 입력...'}"></textarea>
      <button class="btn primary" id="chat-send">전송</button>
    </div>
  `;

  bindChatEvents(card);
}

function renderAssemblyItem(label, value, sub) {
  if (!value) {
    return `
      <div class="assembly-item empty">
        <div class="label">${label}</div>
        <div class="value">— 미부착 —</div>
        ${sub ? `<div class="sub">${sub}</div>` : ''}
      </div>
    `;
  }
  return `
    <div class="assembly-item">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>
  `;
}

function bindChatEvents(card) {
  const input = document.getElementById('chat-input-field');
  const sendBtn = document.getElementById('chat-send');

  const send = async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    sendBtn.disabled = true;

    try {
      const reply = await window.HRAX_LLM.chat({
        cardId: card.id,
        userMessage: text,
        grade: card.grade,
        assembly: card.assembly,
        onToken: () => {} // TODO: 스트리밍
      });
      addMessage('agent', reply);

      // 첫 응답 후 결정 입력 바 노출
      document.getElementById('decision-bar').classList.remove('hidden');
    } catch (err) {
      addMessage('system', err.message);
    } finally {
      sendBtn.disabled = false;
    }
  };

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  // Decision finalize
  document.getElementById('finalize-btn').addEventListener('click', () => {
    const decision = document.getElementById('decision-input').value.trim();
    if (!decision) {
      alert('결정 한 줄을 입력해 주세요.');
      return;
    }
    finalizeCard(card.id, decision);
  });
}

function addMessage(role, text) {
  conversationHistory.push({ role, text, ts: new Date().toISOString() });
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function finalizeCard(cardId, decision) {
  // TODO: 다음 LLM이 실제 검수 후보 추출 + Review Queue push 구현
  const candidate = await window.HRAX_LLM.extractTacitCandidate(
    cardId,
    conversationHistory,
    decision
  );

  alert(
    `[껍데기 모드] 카드 종료 처리\n\n` +
    `결정: ${decision}\n` +
    `→ 검수 후보 큐에 추가됨 (stub)\n\n` +
    `실제 검수 큐 → 지식 데이터 등재 흐름은 다음 LLM이 구현해야 합니다.\n` +
    `BUILD_SPEC.md §검수 흐름 참조.`
  );

  renderWorkspace();
}

// ── ENDPOINT STATUS ──
function updateEndpointStatus() {
  const el = document.getElementById('endpoint-status-top');
  if (!el) return;
  if (window.HRAX_LLM.isConfigured()) {
    el.classList.add('connected');
    el.querySelector('span:last-child').textContent = `LLM: ${window.HRAX_LLM.statusLabel()}`;
  } else {
    el.classList.remove('connected');
    el.querySelector('span:last-child').textContent = 'LLM 미설정';
  }
}

// ── SETTINGS MODAL ──
function openSettings() {
  const modal = document.getElementById('settings-modal');
  modal.classList.add('open');
  document.getElementById('cfg-endpoint').value = window.HRAX_LLM.config.endpoint;
  document.getElementById('cfg-apikey').value = window.HRAX_LLM.config.apiKey;
  document.getElementById('cfg-model').value = window.HRAX_LLM.config.model;
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}

function saveSettings() {
  window.HRAX_LLM.saveConfig({
    endpoint: document.getElementById('cfg-endpoint').value.trim(),
    apiKey: document.getElementById('cfg-apikey').value.trim(),
    model: document.getElementById('cfg-model').value.trim()
  });
  closeSettings();
  updateEndpointStatus();
}

// ── GLOBAL EVENTS ──
function bindGlobalEvents() {
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('settings-cancel').addEventListener('click', closeSettings);
  document.getElementById('settings-save').addEventListener('click', saveSettings);
}

// expose for inline onclick
window.renderWorkspace = renderWorkspace;
