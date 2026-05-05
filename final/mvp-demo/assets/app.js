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

let currentView = 'workspace';
let currentCardId = null;
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
  const formalCount = HRAX_SCENARIOS.filter(s => s.type === 'formal').length;
  const informalCount = HRAX_SCENARIOS.filter(s => s.type === 'informal').length;

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

    <div class="section-title">My Work-space</div>
    <a class="nav-item active" data-filter="all">
      <span class="nav-code">ALL</span>
      <span>모든 카드</span>
      <span class="count">${allCount}</span>
    </a>
    <a class="nav-item" data-filter="formal">
      <span class="nav-code">FR</span>
      <span>정형</span>
      <span class="count">${formalCount}</span>
    </a>
    <a class="nav-item" data-filter="informal">
      <span class="nav-code">IF</span>
      <span>비정형</span>
      <span class="count">${informalCount}</span>
    </a>

    <div class="section-title">도메인</div>
    ${HRAX_DOMAINS.map(d => `
      <a class="nav-item" data-domain="${d.name}">
        <span class="nav-code">${DOMAIN_CODES[d.name] || d.id.slice(0, 2).toUpperCase()}</span>
        <span>${d.name}</span>
        ${d.count > 0 ? `<span class="count">${d.count}</span>` : ''}
      </a>
    `).join('')}

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

  // Bind filter clicks
  document.querySelectorAll('.sidebar .nav-item[data-filter]').forEach(el => {
    el.addEventListener('click', e => {
      document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      const filter = el.dataset.filter;
      renderWorkspace(filter);
    });
  });

  document.querySelectorAll('.sidebar .nav-item[data-domain]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      renderWorkspace('all', el.dataset.domain);
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
function renderWorkspace(filter = 'all', domain = null) {
  currentView = 'workspace';
  currentCardId = null;

  const cards = HRAX_SCENARIOS.filter(s => {
    const typeMatch = filter === 'all' || s.type === filter;
    const domainMatch = !domain || s.domain === domain;
    return typeMatch && domainMatch;
  });

  const typeLabel = filter === 'all' ? '전체' : filter === 'formal' ? '정형' : '비정형';
  const scopeLabel = domain ? `${domain} · ${typeLabel}` : typeLabel;

  const main = document.getElementById('main');
  main.innerHTML = `
    <h1>
      ${HRAX_CURRENT_USER.workspace}
      <span class="lead">권한 단위: ${HRAX_CURRENT_USER.permissionUnit} · ${scopeLabel} 카드 ${cards.length}개</span>
    </h1>
    <div class="workspace-toolbar">
      <span class="section-label">Today's Cards</span>
      <span class="meta">라우팅 · 조립 · 자산화 시연</span>
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
        <span class="tag ${card.type}">${card.type === 'formal' ? '정형' : '비정형'}</span>
        <span class="tag ${card.grade}">${gradeLabel(card.grade)}</span>
        <span class="tag">${card.domain}</span>
      </div>
      <div class="card-title">${card.title}</div>
      <div class="card-desc">${card.description}</div>
      <div class="card-footer">
        <span>${card.process || '비정형 일감'}</span>
        <span class="card-open">OPEN</span>
      </div>
    </div>
  `;
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
        <span class="tag ${card.type}">${card.type === 'formal' ? '정형' : '비정형'}</span>
        <span class="tag ${card.grade}">${gradeLabel(card.grade)}</span>
        <span class="tag">${card.domain}</span>
        ${card.process ? `<span class="tag">${card.process}</span>` : ''}
      </div>
    </div>

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
