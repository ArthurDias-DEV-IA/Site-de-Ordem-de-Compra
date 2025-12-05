/* App: gerenciamento de ordens de compra usando localStorage */
(() => {
  const STORAGE_KEY = 'ordens_compra_v1';
  const uid = () => 'OC-' + Math.random().toString(36).slice(2, 9);

  // DOM
  const q = document.getElementById('q');
  const filterStatus = document.getElementById('filterStatus');
  const filterSupplier = document.getElementById('filterSupplier');
  const sortBy = document.getElementById('sortBy');
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  const emptyHint = document.getElementById('emptyHint');
  const totalOrders = document.getElementById('totalOrders');
  const totalValue = document.getElementById('totalValue');

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const orderForm = document.getElementById('orderForm');
  const btnNew = document.getElementById('btnNew');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');

  const btnExport = document.getElementById('btnExport');
  const detailPanel = document.getElementById('detailPanel');
  const detailContent = document.getElementById('detailContent');
  const detailId = document.getElementById('detailId');
  const closeDetail = document.getElementById('closeDetail');
  const btnEdit = document.getElementById('btnEdit');
  const btnDelete = document.getElementById('btnDelete');

  let editingId = null;

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // seed se estiver vazio
  function seedIfEmpty() {
    const data = load();
    if (data.length > 0) return;

    const sample = [
      {
        id: uid(),
        supplier: 'Tecfornecedores Ltda',
        date: new Date().toISOString().slice(0, 10),
        status: 'pendente',
        items: [
          { name: 'Parafuso', qty: 100, price: 0.45 },
          { name: 'Porca', qty: 50, price: 0.5 }
        ],
      },
      {
        id: uid(),
        supplier: 'EletroMax',
        date: new Date().toISOString().slice(0, 10),
        status: 'em_andamento',
        items: [
          { name: 'Cabo HDMI', qty: 10, price: 15.0 }
        ],
      }
    ];

    save(sample);
  }

  function formatCurrency(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function computeTotals(items) {
    return items.reduce((s, i) => s + (i.qty * i.price), 0);
  }

  function calculateAndRenderStats(data) {
    totalOrders.textContent = data.length;
    const sum = data.reduce((s, o) => s + computeTotals(o.items), 0);
    totalValue.textContent = formatCurrency(sum);
  }

  function render() {
    const data = load();
    calculateAndRenderStats(data);

    const qv = q.value.trim().toLowerCase();
    const fs = filterStatus.value;
    const supplierV = filterSupplier.value.trim().toLowerCase();

    let out = data.filter(o => {
      if (fs !== 'all' && o.status !== fs) return false;
      if (supplierV && !(o.supplier || '').toLowerCase().includes(supplierV)) return false;

      if (qv) {
        const s = o.supplier?.toLowerCase() || '';
        const idMatch = o.id.toLowerCase().includes(qv);
        const supplierMatch = s.includes(qv);
        const itemsMatch = o.items.some(i => i.name.toLowerCase().includes(qv));

        return idMatch || supplierMatch || itemsMatch;
      }
      return true;
    });

    // ordenar
    const s = sortBy.value;
    out.sort((a, b) => {
      if (s === 'created_desc') return b.date.localeCompare(a.date);
      if (s === 'created_asc') return a.date.localeCompare(b.date);
      if (s === 'value_desc') return computeTotals(b.items) - computeTotals(a.items);
      if (s === 'value_asc') return computeTotals(a.items) - computeTotals(b.items);
      return 0;
    });

    // renderizar
    ordersTableBody.innerHTML = '';

    if (out.length === 0) {
      emptyHint.style.display = 'block';
      return;
    } else {
      emptyHint.style.display = 'none';
    }

    out.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${escapeHtml(o.supplier)}</td>
        <td>${o.items.map(i => escapeHtml(i.name)).slice(0, 2).join(', ')}${o.items.length > 2 ? '…' : ''}</td>
        <td>${formatCurrency(computeTotals(o.items))}</td>
        <td>${o.date}</td>
        <td><span class="badge ${o.status}">${statusLabel(o.status)}</span></td>
        <td>
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button data-id="${o.id}" class="btn view">Ver</button>
            <button data-id="${o.id}" class="btn">Editar</button>
          </div>
        </td>
      `;

      ordersTableBody.appendChild(tr);

      tr.querySelector('.view').addEventListener('click', () => openDetail(o.id));
      tr.querySelectorAll('.btn')[1].addEventListener('click', () => openEdit(o.id));
    });
  }

  function openEdit(id) {
    const data = load();
    const ord = data.find(x => x.id === id);
    if (!ord) return;

    editingId = id;

    modalTitle.textContent = 'Editar Ordem';
    orderForm.supplier.value = ord.supplier;
    orderForm.date.value = ord.date;
    orderForm.status.value = ord.status;
    orderForm.items.value = ord.items.map(i => `${i.name}|${i.qty}|${i.price}`).join('\n');

    openModal();
  }

  function openDetail(id) {
    const data = load();
    const ord = data.find(x => x.id === id);
    if (!ord) return;

    detailPanel.hidden = false;
    detailId.textContent = ord.id;
    detailContent.innerHTML = detailHtml(ord);

    document.getElementById('btnEdit').onclick = () => openEdit(ord.id);
    document.getElementById('btnDelete').onclick = () => {
      if (confirm('Excluir ordem?')) deleteOrder(ord.id);
    };
  }

  function closeDetailPanel() {
    detailPanel.hidden = true;
    detailContent.innerHTML = '';
  }

  function deleteOrder(id) {
    let data = load();
    data = data.filter(x => x.id !== id);
    save(data);
    render();
    closeDetailPanel();
  }

  function detailHtml(o) {
    return `
      <p><strong>Fornecedor:</strong> ${escapeHtml(o.supplier)}</p>
      <p><strong>Data:</strong> ${o.date}</p>
      <p><strong>Status:</strong> <span class="badge ${o.status}">${statusLabel(o.status)}</span></p>
      <h4>Produtos</h4>
      <ul>
        ${o.items.map(i =>
          `<li>${escapeHtml(i.name)} — ${i.qty} x ${formatCurrency(i.price)} = ${formatCurrency(i.qty * i.price)}</li>`
        ).join('')}
      </ul>
      <p><strong>Valor total:</strong> ${formatCurrency(computeTotals(o.items))}</p>
    `;
  }

  function statusLabel(s) {
    return {
      pendente: 'Pendente',
      em_andamento: 'Em andamento',
      recebido: 'Recebido',
      cancelado: 'Cancelado'
    }[s] || s;
  }

  function openModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingId = null;
    orderForm.reset();
  }

  function parseItems(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];

    for (const ln of lines) {
      const parts = ln.split('|').map(p => p.trim());
      if (parts.length < 3) continue;

      const name = parts[0];
      const qty = Number(parts[1]) || 0;
      const price = Number(parts[2].replace(',', '.')) || 0;

      items.push({ name, qty, price });
    }

    return items;
  }

  // submit
  orderForm.addEventListener('submit', e => {
    e.preventDefault();

    const form = new FormData(orderForm);
    const supplier = form.get('supplier').trim();
    const date = form.get('date');
    const status = form.get('status');
    const items = parseItems(form.get('items') || '');

    if (!supplier || items.length === 0) {
      alert('Preencha fornecedor e pelo menos um produto.');
      return;
    }

    const data = load();

    if (editingId) {
      const idx = data.findIndex(x => x.id === editingId);
      if (idx > -1) {
        data[idx] = { ...data[idx], supplier, date, status, items };
      }
    } else {
      data.push({ id: uid(), supplier, date, status, items });
    }

    save(data);
    closeModal();
    render();
  });

  // Novo
  btnNew.addEventListener('click', () => {
    editingId = null;
    modalTitle.textContent = 'Nova Ordem';
    orderForm.reset();
    openModal();
  });

  modalClose.onclick = closeModal;
  modalCancel.onclick = closeModal;

  // filtros
  [q, filterStatus, filterSupplier, sortBy].forEach(el =>
    el.addEventListener('input', render)
  );

  // exportar CSV
  btnExport.addEventListener('click', () => {
    const data = load();
    const rows = [['id', 'supplier', 'date', 'status', 'items', 'total']];

    data.forEach(o => {
      rows.push([
        o.id,
        o.supplier,
        o.date,
        o.status,
        o.items.map(i => `${i.name}(${i.qty}x${i.price})`).join('; '),
        computeTotals(o.items)
      ]);
    });

    const csv = rows.map(r =>
      r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'ordens.csv';
    a.click();

    URL.revokeObjectURL(url);
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
  }

  closeDetail.addEventListener('click', closeDetailPanel);

  // click fora do modal → fecha
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // init
  seedIfEmpty();
  render();
})();
