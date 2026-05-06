(function () {
  const apiBase = '/api/wiki';
  const editableDocPaths = new Set(['/docs/ppt', '/docs/one-pager']);
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';

  function normalizedPathname() {
    const path = location.pathname.replace(/\/+$/, '');
    return path || '/';
  }

  function isEditablePage() {
    const path = normalizedPathname();
    return (
      path === '/wiki'
      || (path.startsWith('/wiki/') && path.endsWith('.html'))
      || editableDocPaths.has(path)
    );
  }

  function currentWikiPath() {
    const path = normalizedPathname();
    if (path === '/wiki') return 'overview.html';
    if (path.startsWith('/wiki/')) return path.replace(/^\/wiki\/?/, '') || 'overview.html';
    if (editableDocPaths.has(path)) return path.replace(/^\/+/, '');
    return 'overview.html';
  }

  function addCustomPagesToSidebar() {
    if (!isHttp) return;
    fetch(`${apiBase}/pages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return;
        const sidebar = document.querySelector('aside.sidebar');
        if (!sidebar || sidebar.querySelector('[data-custom-pages]')) return;

        const category = document.createElement('div');
        category.className = 'category';
        category.dataset.customPages = 'true';
        category.textContent = 'User Pages';

        const nav = document.createElement('nav');
        nav.dataset.customPages = 'true';
        data.pages.forEach((page) => {
          const link = document.createElement('a');
          link.href = page.url;
          link.textContent = page.title;
          if (location.pathname === page.url) link.className = 'active';
          nav.appendChild(link);
        });

        sidebar.appendChild(category);
        sidebar.appendChild(nav);
      })
      .catch(() => {});
  }

  function setStatus(toolbar, message, tone) {
    const status = toolbar.querySelector('[data-wiki-status]');
    status.textContent = message || '';
    status.dataset.tone = tone || '';
  }

  function setEditToolsVisible(toolbar, visible) {
    toolbar.querySelectorAll('[data-edit-tool]').forEach((node) => {
      node.hidden = !visible;
    });
  }

  function runCommand(command, value = null) {
    document.execCommand(command, false, value);
  }

  function selectedBlock(main) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return main;
    const baseNode = selection.anchorNode;
    const node = baseNode && (baseNode.nodeType === Node.ELEMENT_NODE ? baseNode : baseNode.parentElement);
    return node ? node.closest('h1,h2,h3,h4,p,li,blockquote,.card,.callout,.tag,span') || main : main;
  }

  function insertHtml(main, html) {
    main.focus();
    runCommand('insertHTML', html);
  }

  function applySemanticStyle(main, value) {
    main.focus();
    if (value === 'dim') {
      runCommand('formatBlock', 'p');
      const block = selectedBlock(main);
      block.classList.add('dim');
      return;
    }
    runCommand('formatBlock', value);
    const block = selectedBlock(main);
    if (block && block.classList) block.classList.remove('dim');
  }

  function applyTone(main, tone) {
    if (!tone) return;
    const toneClasses = ['cyan', 'purple', 'amber', 'green', 'rose'];
    const block = selectedBlock(main);
    const target = block.closest ? block.closest('.card,.callout,blockquote,.tag,.text-tone') : null;
    if (target && target !== main) {
      target.classList.remove(...toneClasses);
      target.classList.add(tone);
      return;
    }
    insertHtml(main, `<span class="text-tone ${tone}">\uAC15\uC870 \uD14D\uC2A4\uD2B8</span>`);
  }

  function insertTable(main) {
    const cols = Math.min(Math.max(parseInt(window.prompt('\uC5F4 \uC218', '3'), 10) || 3, 2), 6);
    const rows = Math.min(Math.max(parseInt(window.prompt('\uD589 \uC218', '3'), 10) || 3, 2), 8);
    const header = '<thead><tr>' + Array.from({ length: cols }, (_, i) => `<th>\uD5E4\uB354 ${i + 1}</th>`).join('') + '</tr></thead>';
    const body = '<tbody>' + Array.from({ length: rows - 1 }, (_, r) => (
      '<tr>' + Array.from({ length: cols }, (_, c) => `<td>\uB0B4\uC6A9 ${r + 1}-${c + 1}</td>`).join('') + '</tr>'
    )).join('') + '</tbody>';
    insertHtml(main, `<table>${header}${body}</table><p></p>`);
  }

  function insertCards(main, count) {
    const classes = count === 3 ? ['cyan', 'purple', 'amber'] : ['cyan', 'purple'];
    const cards = classes.map((tone, index) => `
      <div class="card ${tone}">
        <div class="card-label">Label ${index + 1}</div>
        <h4>\uCE74\uB4DC \uC81C\uBAA9</h4>
        <p>\uCE74\uB4DC \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694.</p>
      </div>
    `).join('');
    insertHtml(main, `<div class="cards cards-${count}">${cards}</div><p></p>`);
  }

  function insertCallout(main) {
    insertHtml(main, `<blockquote class="callout cyan"><p><strong>\uD575\uC2EC \uBA54\uBAA8</strong><br>\uAC15\uC870\uD560 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694.</p></blockquote><p></p>`);
  }

  function insertFaq(main) {
    insertHtml(main, `
      <details class="faq-item">
        <summary>\uC9C8\uBB38\uC744 \uC785\uB825\uD558\uC138\uC694</summary>
        <div class="faq-body">
          <p>\uB2F5\uBCC0\uC744 \uC785\uB825\uD558\uC138\uC694.</p>
        </div>
      </details>
    `);
  }

  function createToolbar() {
    const main = document.querySelector('main.content');
    if (!main || !isHttp || !isEditablePage()) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'wiki-toolbar';
    toolbar.innerHTML = `
      <select class="wiki-select" data-action="style" data-edit-tool hidden aria-label="Text style">
        <option value="p">\uBCF8\uBB38</option>
        <option value="h2">\uC81C\uBAA9</option>
        <option value="h3">\uC18C\uC81C\uBAA9</option>
        <option value="h4">\uB0B4\uC6A9 \uC81C\uBAA9</option>
        <option value="dim">\uBCF4\uC870 \uC124\uBA85</option>
      </select>
      <button type="button" class="btn-wiki" data-action="bold" data-edit-tool hidden>Bold</button>
      <button type="button" class="btn-wiki" data-action="bullet" data-edit-tool hidden>List</button>
      <button type="button" class="btn-wiki" data-action="numbered" data-edit-tool hidden>1. List</button>
      <button type="button" class="btn-wiki" data-action="table" data-edit-tool hidden>Table</button>
      <button type="button" class="btn-wiki" data-action="cards2" data-edit-tool hidden>2 Cards</button>
      <button type="button" class="btn-wiki" data-action="cards3" data-edit-tool hidden>3 Cards</button>
      <button type="button" class="btn-wiki" data-action="callout" data-edit-tool hidden>Callout</button>
      <button type="button" class="btn-wiki" data-action="faq" data-edit-tool hidden>FAQ</button>
      <select class="wiki-select" data-action="tone" data-edit-tool hidden aria-label="Tone">
        <option value="">\uC0C9\uC0C1</option>
        <option value="cyan">\uC815\uBCF4</option>
        <option value="purple">\uAC15\uC870</option>
        <option value="amber">\uC8FC\uC758</option>
        <option value="green">\uC131\uACF5</option>
        <option value="rose">\uC704\uD5D8</option>
      </select>
      <button type="button" class="btn-wiki" data-action="edit">Edit</button>
      <button type="button" class="btn-wiki primary" data-action="save" hidden>Save</button>
      <button type="button" class="btn-wiki" data-action="cancel" hidden>Cancel</button>
      <button type="button" class="btn-wiki" data-action="new">New Page</button>
      <span class="wiki-status" data-wiki-status></span>
    `;
    document.body.appendChild(toolbar);
    setEditToolsVisible(toolbar, false);

    fetch(`${apiBase}/page?path=${encodeURIComponent(currentWikiPath())}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.upstream_changed) {
          setStatus(toolbar, 'Local DB edit shown; seed changed', 'error');
        } else if (data.has_overlay) {
          setStatus(toolbar, 'Local DB edit shown', 'success');
        }
      })
      .catch(() => {});

    let original = '';

    toolbar.querySelector('[data-action="edit"]').addEventListener('click', () => {
      original = main.innerHTML;
      main.contentEditable = 'true';
      main.classList.add('wiki-editing');
      toolbar.querySelector('[data-action="edit"]').hidden = true;
      toolbar.querySelector('[data-action="save"]').hidden = false;
      toolbar.querySelector('[data-action="cancel"]').hidden = false;
      setEditToolsVisible(toolbar, true);
      setStatus(toolbar, 'Editing current page', '');
      main.focus();
    });

    toolbar.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      main.innerHTML = original;
      main.contentEditable = 'false';
      main.classList.remove('wiki-editing');
      toolbar.querySelector('[data-action="edit"]').hidden = false;
      toolbar.querySelector('[data-action="save"]').hidden = true;
      toolbar.querySelector('[data-action="cancel"]').hidden = true;
      setEditToolsVisible(toolbar, false);
      setStatus(toolbar, 'Edit cancelled', '');
    });

    toolbar.querySelector('[data-action="save"]').addEventListener('click', async () => {
      setStatus(toolbar, 'Saving...', '');
      try {
        const res = await fetch(`${apiBase}/page`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: currentWikiPath(), content: main.innerHTML })
        });
        if (!res.ok) throw new Error(await res.text());
        main.contentEditable = 'false';
        main.classList.remove('wiki-editing');
        toolbar.querySelector('[data-action="edit"]').hidden = false;
        toolbar.querySelector('[data-action="save"]').hidden = true;
        toolbar.querySelector('[data-action="cancel"]').hidden = true;
        setEditToolsVisible(toolbar, false);
        setStatus(toolbar, 'Saved to local wiki DB', 'success');
      } catch (err) {
        setStatus(toolbar, `Save failed: ${err.message || err}`, 'error');
      }
    });

    toolbar.addEventListener('click', (event) => {
      const action = event.target.dataset && event.target.dataset.action;
      if (!action || !event.target.hasAttribute('data-edit-tool')) return;
      event.preventDefault();
      if (action === 'bold') runCommand('bold');
      if (action === 'bullet') runCommand('insertUnorderedList');
      if (action === 'numbered') runCommand('insertOrderedList');
      if (action === 'table') insertTable(main);
      if (action === 'cards2') insertCards(main, 2);
      if (action === 'cards3') insertCards(main, 3);
      if (action === 'callout') insertCallout(main);
      if (action === 'faq') insertFaq(main);
      main.focus();
    });

    toolbar.querySelector('[data-action="style"]').addEventListener('change', (event) => {
      applySemanticStyle(main, event.target.value);
      event.target.value = 'p';
    });

    toolbar.querySelector('[data-action="tone"]').addEventListener('change', (event) => {
      applyTone(main, event.target.value);
      event.target.value = '';
      main.focus();
    });

    toolbar.querySelector('[data-action="new"]').addEventListener('click', async () => {
      const title = window.prompt('\uC0C8 \uD398\uC774\uC9C0 \uC81C\uBAA9');
      if (!title) return;
      const suggested = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '-') || 'new-page';
      const slug = window.prompt('URL slug (\uC601\uBB38/\uC22B\uC790 \uAD8C\uC7A5)', suggested);
      if (!slug) return;

      setStatus(toolbar, 'Creating page...', '');
      try {
        const res = await fetch(`${apiBase}/page`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, slug })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
        location.href = data.url;
      } catch (err) {
        setStatus(toolbar, `Create failed: ${err.message || err}`, 'error');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    addCustomPagesToSidebar();
    createToolbar();
  });
})();
