/*
 * Main application script for 7YUP PRO+ starter.
 * Handles loading promotions, rendering cards, search and filter,
 * modal dialog, FAQ rendering and simple theme/reduce motion toggles.
 */

(function() {
  const state = {
    promos: [],
    selectedTag: 'ทั้งหมด',
    search: '',
    faq: [],
    page: 1,
    perPage: 30,
    savedOnly: false,
    currentPromo: null
  };

  // Fetch promotions and faq data, then render
  async function init() {
    try {
      const [promosResp, faqResp] = await Promise.all([
        fetch('data/promos.json'),
        fetch('data/faq.json')
      ]);
      state.promos = await promosResp.json();
      state.faq = await faqResp.json();
      // Determine if this page shows only saved promos
      state.savedOnly = !!window.SHOW_SAVED_PROMOS;
      renderChips();
      renderGrid();
      renderFAQ();
    } catch (err) {
      console.error('Error loading data', err);
    }
  }

  // Build filter chips based on unique tags
  function renderChips() {
    const chipsEl = document.getElementById('chips');
    const tagSet = new Set();
    state.promos.forEach(p => {
      (p.tag || []).forEach(t => tagSet.add(t));
    });
    const tags = Array.from(tagSet).sort();
    chipsEl.innerHTML = '';
    const allButton = createChip('ทั้งหมด');
    chipsEl.appendChild(allButton);
    tags.forEach(tag => {
      const btn = createChip(tag);
      chipsEl.appendChild(btn);
    });
    // Set initial active chip
    setActiveChip(state.selectedTag);
  }

  function createChip(tag) {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      state.selectedTag = tag;
      setActiveChip(tag);
      state.page = 1;
      renderGrid();
    });
    return btn;
  }

  function setActiveChip(tag) {
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      const isActive = chip.textContent === tag;
      chip.setAttribute('aria-selected', isActive);
      chip.classList.toggle('is-active', isActive);
    });
  }

  // Render grid of cards based on current search and selected tag
  function renderGrid() {
    const gridEl = document.getElementById('grid');
    const searchLower = state.search.trim().toLowerCase();
    const savedIds = getSaved();
    const filtered = state.promos.filter(p => {
      // If saved-only view, only include saved promos
      if (state.savedOnly && !savedIds.includes(p.id)) return false;
      // tag filter
      const matchTag = state.selectedTag === 'ทั้งหมด' || (p.tag && p.tag.includes(state.selectedTag));
      // search filter
      const text = `${p.title} ${p.subtitle || ''} ${p.brand || ''}`.toLowerCase();
      const matchSearch = !searchLower || text.includes(searchLower);
      return matchTag && matchSearch;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    // Ensure current page within bounds
    if (state.page > totalPages) state.page = totalPages;
    const startIdx = (state.page - 1) * state.perPage;
    const endIdx = startIdx + state.perPage;
    const pageItems = filtered.slice(startIdx, endIdx);
    gridEl.innerHTML = '';
    if (pageItems.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'muted';
      msg.textContent = state.savedOnly ? 'ไม่มีรายการที่บันทึก' : 'ไม่พบรายการ';
      gridEl.appendChild(msg);
    } else {
      pageItems.forEach(promo => {
        const card = document.createElement('article');
        card.className = 'card';
        card.dataset.id = promo.id;
        // Only show image in the card; clicking will open modal
        card.innerHTML = `<img src="${promo.image}" alt="" loading="lazy" />`;
        gridEl.appendChild(card);
      });
    }
    renderPagination(totalPages);
  }

  // Render FAQ section
  function renderFAQ() {
    const faqEl = document.getElementById('faq');
    faqEl.innerHTML = '';
    state.faq.forEach(item => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = item.q;
      const p = document.createElement('p');
      p.textContent = item.a;
      details.appendChild(summary);
      details.appendChild(p);
      faqEl.appendChild(details);
    });
  }

  // Render pagination controls
  function renderPagination(totalPages) {
    const nav = document.getElementById('pagination');
    if (!nav) return;
    // Hide if only one page
    if (totalPages <= 1) {
      nav.innerHTML = '';
      nav.hidden = true;
      return;
    }
    nav.hidden = false;
    nav.innerHTML = '';
    // Previous button
    if (state.page > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'ก่อนหน้า';
      prevBtn.className = 'btn btn-quiet';
      prevBtn.onclick = () => {
        state.page--;
        renderGrid();
      };
      nav.appendChild(prevBtn);
    }
    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = String(i);
      btn.className = 'btn btn-quiet';
      if (i === state.page) {
        btn.setAttribute('aria-current', 'page');
      }
      btn.onclick = () => {
        state.page = i;
        renderGrid();
      };
      nav.appendChild(btn);
    }
    // Next button
    if (state.page < totalPages) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'ถัดไป';
      nextBtn.className = 'btn btn-quiet';
      nextBtn.onclick = () => {
        state.page++;
        renderGrid();
      };
      nav.appendChild(nextBtn);
    }
  }

  // Escape text to prevent HTML injection
  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, c => {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c] || c;
    });
  }

  // Modal logic
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalDetails = document.getElementById('modalDetails');
  const modalApply = document.getElementById('modalApply');
  const modalCopy = document.getElementById('modalCopy');
  const modalSave = document.getElementById('modalSave');

  function openModal(promo) {
    state.currentPromo = promo;
    modalImg.src = promo.image;
    modalTitle.textContent = `ชื่อ: ${promo.title}`;
    // Build full details: subtitle and terms
    let detailParts = [];
    if (promo.subtitle) {
      detailParts.push(escapeHtml(promo.subtitle));
    }
    if (promo.terms && promo.terms.length) {
      detailParts = detailParts.concat(promo.terms.map(t => escapeHtml(t)));
    }
    modalDetails.innerHTML = `<strong>รายละเอียดเต็มของโปร:</strong> ${detailParts.join('<br>')}`;
    modalApply.href = promo.link;
    modalCopy.onclick = () => {
      navigator.clipboard.writeText(promo.link).then(() => {
        alert('คัดลอกลิงก์แล้ว');
      }).catch(() => {
        prompt('คัดลอกลิงก์ด้วยตนเอง:', promo.link);
      });
    };
    // Update save button text and handler
    updateSaveButton(promo.id);
    if (modalSave) {
      modalSave.onclick = () => {
        toggleSave(promo.id);
      };
    }
    modal.showModal();
  }

  // Save/unsave handling
  function getSaved() {
    try {
      return JSON.parse(localStorage.getItem('saved') || '[]');
    } catch {
      return [];
    }
  }
  function setSaved(list) {
    localStorage.setItem('saved', JSON.stringify(list));
  }
  function updateSaveButton(id) {
    if (!modalSave) return;
    const saved = getSaved();
    if (saved.includes(id)) {
      modalSave.textContent = 'ลบรายการ';
      modalSave.classList.remove('btn-quiet');
      modalSave.classList.add('btn-danger');
    } else {
      modalSave.textContent = 'บันทึก';
      modalSave.classList.remove('btn-danger');
      modalSave.classList.add('btn-quiet');
    }
  }
  function toggleSave(id) {
    let saved = getSaved();
    const idx = saved.indexOf(id);
    if (idx >= 0) {
      saved.splice(idx, 1);
    } else {
      saved.push(id);
    }
    setSaved(saved);
    updateSaveButton(id);
    // If viewing saved only, re-render grid to reflect removal/addition
    if (state.savedOnly) {
      renderGrid();
    }
  }

  // Delegation for card click: open modal when clicking on a card
  document.addEventListener('click', event => {
    const cardEl = event.target.closest('.card');
    if (cardEl && cardEl.dataset.id) {
      const id = cardEl.dataset.id;
      const promo = state.promos.find(p => p.id === id);
      if (promo) openModal(promo);
    }
  });

  // Close modal when clicking outside or on close button
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      modal.close();
    }
  });

  // Search input
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.search = e.target.value;
      state.page = 1;
      renderGrid();
    });
  }

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'light' ? null : 'light';
      if (next) {
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      } else {
        html.removeAttribute('data-theme');
        localStorage.removeItem('theme');
      }
    });
    // load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Reduce motion toggle
  const reduceBtn = document.getElementById('reduceMotionBtn');
  if (reduceBtn) {
    reduceBtn.addEventListener('click', () => {
      const pressed = reduceBtn.getAttribute('aria-pressed') === 'true';
      const next = !pressed;
      reduceBtn.setAttribute('aria-pressed', String(next));
      document.documentElement.style.setProperty('--transition-duration', next ? '0ms' : '200ms');
    });
  }

  // Menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const menuPanel = document.getElementById('menuPanel');
  if (menuBtn && menuPanel) {
    menuBtn.addEventListener('click', () => {
      const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!expanded));
      menuPanel.hidden = expanded;
    });
    document.addEventListener('click', e => {
      if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
        menuPanel.hidden = true;
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Install PWA
  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-flex';
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA installed');
      }
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
    // Hide install button by default
    installBtn.style.display = 'none';
  }

  // Initialize on DOM ready
  window.addEventListener('DOMContentLoaded', init);
})();