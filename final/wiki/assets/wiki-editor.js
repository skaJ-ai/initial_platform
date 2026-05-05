(function () {
  const apiBase = '/api/wiki';
  const isEditableWikiPage = location.pathname === '/wiki/' || (location.pathname.startsWith('/wiki/') && location.pathname.endsWith('.html'));
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';

  function currentWikiPath() {
    let path = location.pathname.replace(/^\/wiki\/?/, '');
    return path || 'overview.html';
  }

  function addCustomPagesToSidebar() {
    if (!isHttp) return;
    fetch(`${apiBase}/pages`)
      .then((res) => res.ok ? res.json() : null)
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

  function createToolbar() {
    const main = document.querySelector('main.content');
    if (!main || !isHttp || !isEditableWikiPage) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'wiki-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="btn-wiki" data-action="edit">Edit</button>
      <button type="button" class="btn-wiki primary" data-action="save" hidden>Save</button>
      <button type="button" class="btn-wiki" data-action="cancel" hidden>Cancel</button>
      <button type="button" class="btn-wiki" data-action="new">New Page</button>
      <span class="wiki-status" data-wiki-status></span>
    `;
    document.body.appendChild(toolbar);

    let original = '';

    toolbar.querySelector('[data-action="edit"]').addEventListener('click', () => {
      original = main.innerHTML;
      main.contentEditable = 'true';
      main.classList.add('wiki-editing');
      toolbar.querySelector('[data-action="edit"]').hidden = true;
      toolbar.querySelector('[data-action="save"]').hidden = false;
      toolbar.querySelector('[data-action="cancel"]').hidden = false;
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
        setStatus(toolbar, 'Saved', 'success');
      } catch (err) {
        setStatus(toolbar, `Save failed: ${err.message || err}`, 'error');
      }
    });

    toolbar.querySelector('[data-action="new"]').addEventListener('click', async () => {
      const title = window.prompt('새 페이지 제목');
      if (!title) return;
      const suggested = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const slug = window.prompt('URL slug (영문/숫자 권장)', suggested.replace(/[가-힣]/g, '') || 'new-page');
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
