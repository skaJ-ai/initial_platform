/**
 * HR AX Platform — MVP Demo App Logic
 *
 * Client-side chat-first demo shell. Route Trace is visualized before each
 * LLM call; the LLM client remains responsible only for request/fallback.
 */

const HRAX_CURRENT_USER = window.HRAX_DATA.CURRENT_USER;
const HRAX_SCENARIOS = window.HRAX_DATA.SCENARIOS;

let currentView = 'chat';
let currentCardId = null;
let conversationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();
  renderSidebar();
  renderChatHome({ reset: true });
  bindGlobalEvents();
  updateEndpointStatus();
});

function renderTopbar() {
  document.getElementById('user-chip').textContent = `${HRAX_CURRENT_USER.name} · ${HRAX_CURRENT_USER.role}`;
  document.getElementById('breadcrumb').textContent = HRAX_CURRENT_USER.role;
}

function renderSidebar() {
  const accessDomains = HRAX_CURRENT_USER.domains || [];
  const sidebar = document.getElementById('sidebar');

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-name">HR AX Platform</div>
      <div class="logo-sub">Concept & MVP Sharing</div>
    </div>

    <button class="new-chat" id="new-chat-btn" type="button">새 대화</button>

    <div class="section-title">Quick Starts</div>
    <div class="quick-start-list">
      ${HRAX_SCENARIOS.map(card => `
        <button class="quick-start" type="button" data-card-id="${escapeHtml(card.id)}">
          <span>${escapeHtml(card.quickStartLabel || card.title)}</span>
          <small>${escapeHtml(card.routing.grade)} · ${escapeHtml(card.domain)}</small>
        </button>
      `).join('')}
    </div>

    <div class="scope-card">
      <div class="scope-label">로그인 기반 권한</div>
      <strong>${escapeHtml(HRAX_CURRENT_USER.org || HRAX_CURRENT_USER.role)}</strong>
      <div class="scope-tags">
        ${accessDomains.map(name => `<span>${escapeHtml(name)}</span>`).join('')}
      </div>
      <p>권한·민감도·입력 의도를 기준으로 라우팅과 게이트를 먼저 판단합니다.</p>
    </div>

    <div class="section-title">Activity</div>
    <button class="activity-link" type="button" data-view="review-queue">
      <span>검수 큐</span>
      <small>0</small>
    </button>
    <button class="activity-link" type="button" data-view="audit-log">
      <span>감사 로그</span>
    </button>
  `;

  document.getElementById('new-chat-btn').addEventListener('click', () => {
    currentCardId = null;
    conversationHistory = [];
    renderSidebar();
    renderChatHome({ reset: false });
  });

  sidebar.querySelectorAll('.quick-start').forEach(button => {
    button.addEventListener('click', () => {
      const card = getCard(button.dataset.cardId);
      if (!card) return;
      fillChatInput(card.samplePrompt, card.id);
    });
  });

  sidebar.querySelectorAll('.activity-link').forEach(button => {
    button.addEventListener('click', () => renderActivityEmpty(button.dataset.view));
  });
}

function renderChatHome({ reset = false } = {}) {
  currentView = 'chat';
  if (reset) {
    currentCardId = null;
    conversationHistory = [];
  }

  const main = document.getElementById('main');
  main.innerHTML = `
    <section class="chat-home">
      <div class="chat-header">
        <div>
          <span class="eyebrow">MX사업부 People팀</span>
          <h1>질문을 입력하면 먼저 안전 게이트를 통과합니다</h1>
        </div>
        <p>빠른 시작을 누르면 예시 프롬프트만 입력창에 채워집니다. 전송은 사용자가 직접 결정합니다.</p>
      </div>

      <div class="route-trace hidden" id="route-trace"></div>

      <div class="chat-messages" id="chat-messages">
        <div class="empty-chat" id="empty-chat">
          <strong>처리할 HR 업무를 입력하세요.</strong>
          <span>예: 업적평가 결과를 보고서로 정리하고, 조직별 편차 원인과 후속 조치까지 뽑아줘</span>
        </div>
      </div>

      <form class="chat-input" id="chat-form">
        <textarea id="chat-input-field" rows="3" placeholder="업무 요청을 입력하세요"></textarea>
        <button class="btn primary" id="chat-send" type="submit">전송</button>
      </form>
    </section>
  `;

  bindChatHome();
  renderMessagesFromHistory();
}

function renderActivityEmpty(view) {
  currentView = 'activity-empty';
  const title = view === 'audit-log' ? '감사 로그' : '검수 큐';
  const main = document.getElementById('main');
  main.innerHTML = `
    <section class="activity-empty">
      <span class="eyebrow">Activity</span>
      <h1>${title}</h1>
      <p>
        이 데모에서는 아직 비어 있습니다. 실제 운영에서는 카드 종료 후 검수 후보가,
        모든 호출은 감사 로그로 쌓입니다.
      </p>
      <button class="btn" id="activity-back" type="button">채팅으로 돌아가기</button>
    </section>
  `;

  document.getElementById('activity-back').addEventListener('click', () => {
    renderChatHome({ reset: false });
  });
}

function bindChatHome() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input-field');
  const sendButton = document.getElementById('chat-send');
  if (!form || !input || !sendButton) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    sendChatMessage(input, sendButton);
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage(input, sendButton);
    }
  });
}

function fillChatInput(promptText, cardId) {
  if (currentView !== 'chat') renderChatHome({ reset: false });
  currentCardId = cardId;
  renderSidebar();

  const input = document.getElementById('chat-input-field');
  if (!input) return;
  input.value = promptText || '';
  input.focus();

  const selected = document.querySelector(`.quick-start[data-card-id="${cssEscape(cardId)}"]`);
  if (selected) selected.classList.add('active');
}

async function sendChatMessage(input, sendButton) {
  const text = input.value.trim();
  if (!text || sendButton.disabled) return;

  const card = currentCardId ? getCard(currentCardId) : null;
  const steps = card?.routeSteps || window.HRAX_DATA.DEFAULT_ROUTE_STEPS;
  const assembly = card?.assembly || window.HRAX_DATA.DEFAULT_ASSEMBLY;
  const grade = card?.grade || 'general';

  addMessage('user', text);
  input.value = '';
  sendButton.disabled = true;

  await runRouteTracePartial(steps);

  let reply = '';
  let fallbackUsed = false;
  try {
    reply = await window.HRAX_LLM.chat({
      cardId: card?.id,
      userMessage: text,
      grade,
      assembly,
      onToken: () => {}
    });
    fallbackUsed = !card && isGenericLlmFallback(reply);
    if (fallbackUsed) reply = window.HRAX_DATA.DEFAULT_SAMPLE_REPLY;
  } catch (error) {
    fallbackUsed = true;
    reply = card?.sampleAgentReply || window.HRAX_DATA.DEFAULT_SAMPLE_REPLY;
    console.info('[MVP Demo] LLM call threw; using sample fallback', error);
  }

  finishRouteTraceStep5(fallbackUsed ? 'warn' : 'ok', card?.routing?.model || '응답 도착 (sample fallback)');
  addMessage('agent', reply, { assembly, card });
  sendButton.disabled = false;
  input.focus();
}

function renderMessagesFromHistory() {
  const messages = document.getElementById('chat-messages');
  const empty = document.getElementById('empty-chat');
  if (!messages) return;
  if (conversationHistory.length > 0 && empty) empty.remove();
  conversationHistory.forEach(item => {
    messages.appendChild(createMessageNode(item));
  });
  messages.scrollTop = messages.scrollHeight;
}

function addMessage(role, text, meta = null) {
  conversationHistory.push({ role, text, meta, ts: new Date().toISOString() });
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  const empty = document.getElementById('empty-chat');
  if (empty) empty.remove();

  messages.appendChild(createMessageNode({ role, text, meta }));
  messages.scrollTop = messages.scrollHeight;
}

function createMessageNode({ role, text, meta }) {
  const wrap = document.createElement('div');
  wrap.className = `message-row ${role}`;

  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  wrap.appendChild(bubble);

  if (role === 'agent' && meta?.assembly) {
    const toggle = document.createElement('button');
    toggle.className = 'assembly-toggle';
    toggle.type = 'button';
    toggle.textContent = 'ⓘ 처리 메타 보기';
    wrap.appendChild(toggle);

    const panel = document.createElement('div');
    panel.className = 'assembly-popover hidden';
    panel.innerHTML = renderAssemblyPanel(meta.assembly, meta.card);
    wrap.appendChild(panel);

    toggle.addEventListener('click', () => {
      const isHidden = panel.classList.toggle('hidden');
      toggle.textContent = isHidden ? 'ⓘ 처리 메타 보기' : 'ⓘ 처리 메타 접기';
    });
  }

  return wrap;
}

function renderAssemblyPanel(assembly, card) {
  const agent = assembly.agent
    ? `${assembly.agent.name} (${assembly.agent.type})`
    : '기본 HR AX Copilot';
  const skill = assembly.skill?.name || '기본 응답 기준';
  const tool = assembly.tool?.length ? assembly.tool.join(', ') : '미부착';
  const context = assembly.context?.length ? assembly.context.join(', ') : '기본 HR 맥락';
  const lPath = card?.processMeta
    ? `${card.processMeta.l3} / ${card.processMeta.l4} / ${card.processMeta.l5} / ${card.processMeta.l6}`
    : '일반 입력 / 후보 추정';

  return `
    ${renderMetaItem('Agent', agent, assembly.agent?.sub)}
    ${renderMetaItem('Skill', skill, assembly.skill?.sub)}
    ${renderMetaItem('Tool', tool)}
    ${renderMetaItem('Context', context)}
    ${renderMetaItem('L3-L6', lPath)}
  `;
}

function renderMetaItem(label, value, sub = '') {
  return `
    <div class="assembly-item">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
      ${sub ? `<div class="sub">${escapeHtml(sub)}</div>` : ''}
    </div>
  `;
}

function renderRouteTrace(steps) {
  const trace = document.getElementById('route-trace');
  if (!trace) return;

  trace.className = 'route-trace';
  trace.innerHTML = `
    <button class="route-trace-summary hidden" id="route-trace-summary" type="button"></button>
    <div class="route-trace-steps" id="route-trace-steps">
      ${steps.map((step, index) => `
        <div class="route-trace-step pending" data-step-index="${index}">
          <span class="step-index">${index + 1}</span>
          <div>
            <strong>${escapeHtml(step.label)}</strong>
            <small>${escapeHtml(step.detail || '')}</small>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('route-trace-summary').addEventListener('click', () => {
    trace.classList.toggle('collapsed');
  });
}

async function runRouteTracePartial(steps) {
  renderRouteTrace(steps);
  for (let index = 0; index < Math.min(4, steps.length); index += 1) {
    const step = steps[index];
    await wait(step.delay || 0);
    updateRouteStep(index, step.status || 'ok');
  }
  updateRouteStep(4, 'live');
}

function finishRouteTraceStep5(status, detail) {
  updateRouteStep(4, status || 'ok', detail);

  const trace = document.getElementById('route-trace');
  const summary = document.getElementById('route-trace-summary');
  if (!trace || !summary) return;

  summary.textContent = detail ? `요약 · ${detail}` : '요약 · 라우팅 완료';
  summary.classList.remove('hidden');
  trace.classList.add('collapsed');
}

function updateRouteStep(index, status, detail) {
  const step = document.querySelector(`.route-trace-step[data-step-index="${index}"]`);
  if (!step) return;
  step.classList.remove('pending', 'ok', 'skip', 'warn', 'block', 'live');
  step.classList.add(status);
  if (detail) {
    const small = step.querySelector('small');
    if (small) small.textContent = detail;
  }
}

function updateEndpointStatus() {
  const el = document.getElementById('endpoint-status-top');
  if (!el) return;

  const connected = window.HRAX_LLM.isConfigured();
  el.classList.toggle('connected', connected);
  el.querySelector('span:last-child').textContent = connected
    ? `LLM: ${window.HRAX_LLM.statusLabel()}`
    : 'LLM 미설정';
}

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

function bindGlobalEvents() {
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('settings-cancel').addEventListener('click', closeSettings);
  document.getElementById('settings-save').addEventListener('click', saveSettings);
}

function getCard(cardId) {
  return HRAX_SCENARIOS.find(card => card.id === cardId) || null;
}

function isGenericLlmFallback(reply) {
  return typeof reply === 'string'
    && reply.trim().startsWith('[SAMPLE]')
    && reply.includes('LLM');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}
