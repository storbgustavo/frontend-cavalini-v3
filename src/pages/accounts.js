import { api } from '../api.js'
import { formatCurrency, formatDate, debounce, toast } from '../utils.js'

let state = {
  accounts: [],
  filtered: [],
  search: '',
  platform: '',
  platforms: [],
  limit: 25,
  offset: 0,
  total: 0,
  loading: false,
}

export async function renderAccounts(contentEl) {
  contentEl.innerHTML = `
    <div class="page">
      <div class="toolbar-row">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="acc-search" placeholder="Buscar por usuário, ID, PIX..." />
        </div>
        <select class="form-select filter-select" id="acc-platform-filter">
          <option value="">Todas as plataformas</option>
        </select>
        <select class="form-select filter-select" id="acc-limit">
          <option value="25">25 por página</option>
          <option value="50">50 por página</option>
          <option value="100">100 por página</option>
        </select>
      </div>
      <div class="panel">
        <div class="panel-body" style="padding:0">
          <div id="acc-table">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>
        <div class="pagination" id="acc-pagination"></div>
      </div>
    </div>
  `

  try {
    const platforms = await api.getPlatforms()
    state.platforms = Array.isArray(platforms) ? platforms : (platforms.platforms ?? [])
    const sel = document.getElementById('acc-platform-filter')
    state.platforms.forEach(p => {
      const name = typeof p === 'string' ? p : (p.name ?? p.platform ?? p)
      const opt = document.createElement('option')
      opt.value = name
      opt.textContent = name
      sel.appendChild(opt)
    })
  } catch {
    // platforms endpoint may not exist; continue without filter options
  }

  const debouncedSearch = debounce((v) => {
    state.search = v
    state.offset = 0
    loadAccounts()
  }, 350)

  document.getElementById('acc-search').addEventListener('input', (e) => debouncedSearch(e.target.value))
  document.getElementById('acc-platform-filter').addEventListener('change', (e) => {
    state.platform = e.target.value
    state.offset = 0
    loadAccounts()
  })
  document.getElementById('acc-limit').addEventListener('change', (e) => {
    state.limit = parseInt(e.target.value)
    state.offset = 0
    loadAccounts()
  })

  await loadAccounts()
}

async function loadAccounts() {
  if (state.loading) return
  state.loading = true
  const tableEl = document.getElementById('acc-table')
  if (!tableEl) return
  tableEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>'

  try {
    const params = {
      limit: state.limit,
      offset: state.offset,
    }
    if (state.platform) params.platform = state.platform
    if (state.search) params.search = state.search

    const data = await api.getAccounts(params)
    const accounts = Array.isArray(data) ? data : (data.accounts ?? data.items ?? [])
    state.accounts = accounts
    state.total = Array.isArray(data) ? accounts.length : (data.total ?? accounts.length)

    renderTable()
    renderPagination()
  } catch (err) {
    tableEl.innerHTML = `<div class="table-empty" style="color:var(--error)">Erro ao carregar contas: ${err.message}</div>`
    toast('Erro ao carregar contas', 'error')
  } finally {
    state.loading = false
  }
}

function renderTable() {
  const tableEl = document.getElementById('acc-table')
  if (state.accounts.length === 0) {
    tableEl.innerHTML = '<div class="table-empty">Nenhuma conta encontrada.</div>'
    return
  }

  tableEl.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Plataforma</th>
            <th>Usuário</th>
            <th>Senha</th>
            <th>PIX</th>
            <th>Bônus</th>
            <th>Saldo</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${state.accounts.map(a => `
            <tr>
              <td style="font-family:var(--mono);font-size:12px;color:var(--text-dim)">${a.id ?? '-'}</td>
              <td><span class="badge badge-platform">${a.platform ?? '-'}</span></td>
              <td>${a.username ?? a.user ?? '-'}</td>
              <td style="font-family:var(--mono);font-size:12px;color:var(--text-dim)">${a.password ?? '***'}</td>
              <td style="font-family:var(--mono);font-size:12px">${a.pix ?? a.pix_type ?? '-'}</td>
              <td style="color:var(--success);font-weight:600">${formatCurrency(a.bonus ?? 0)}</td>
              <td style="color:var(--success);font-weight:600">${formatCurrency(a.balance ?? 0)}</td>
              <td style="color:var(--text-dim);font-size:12px">${formatDate(a.created_at ?? a.date ?? a.timestamp)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderPagination() {
  const pagEl = document.getElementById('acc-pagination')
  if (!pagEl) return
  const from = state.offset + 1
  const to = Math.min(state.offset + state.accounts.length, state.total)
  const hasPrev = state.offset > 0
  const hasNext = state.offset + state.limit < state.total

  pagEl.innerHTML = `
    <span class="pagination-info">
      ${state.total > 0 ? `${from}-${to} de ${state.total}` : '0 contas'}
    </span>
    <div class="pagination-controls">
      <button class="btn btn-sm" id="acc-prev" ${!hasPrev ? 'disabled' : ''}>Anterior</button>
      <button class="btn btn-sm" id="acc-next" ${!hasNext ? 'disabled' : ''}>Próximo</button>
    </div>
  `

  if (hasPrev) {
    document.getElementById('acc-prev').addEventListener('click', () => {
      state.offset = Math.max(0, state.offset - state.limit)
      loadAccounts()
    })
  }
  if (hasNext) {
    document.getElementById('acc-next').addEventListener('click', () => {
      state.offset += state.limit
      loadAccounts()
    })
  }
}
