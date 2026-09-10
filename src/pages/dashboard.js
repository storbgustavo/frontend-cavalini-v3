import { api } from '../api.js'
import { formatCurrency, formatDate, toast, ICONS } from '../utils.js'

export async function renderDashboard(contentEl) {
  contentEl.innerHTML = `
    <div class="page">
      <div class="stats-grid" id="stats-grid">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Desempenho por Plataforma</span>
          <button class="btn btn-ghost btn-sm" id="refresh-stats">
            ${createIconWrapped('refresh', 16)} Atualizar
          </button>
        </div>
        <div class="panel-body" style="padding:0">
          <div id="platform-table"><div class="loading-spinner"><div class="spinner"></div></div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Atividade Recente</span>
        </div>
        <div class="panel-body" style="padding:0">
          <div id="recent-accounts"><div class="loading-spinner"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>
  `

  document.getElementById('refresh-stats').addEventListener('click', () => loadStats(contentEl))
  await loadStats(contentEl)
}

async function loadStats(contentEl) {
  try {
    const [stats, accounts] = await Promise.all([
      api.getStats(),
      api.getAccounts({ limit: 8 }),
    ])

    const total = stats.total ?? 0
    const bonus = stats.total_bonus ?? stats.bonus ?? 0
    const balance = stats.total_balance ?? stats.balance ?? 0
    const errors = stats.errors ?? stats.total_errors ?? 0

    document.getElementById('stats-grid').innerHTML = `
      ${statCard('Total de Contas', total, 'users', `${stats.active ?? 0} ativas`, '')}
      ${statCard('Bônus Total', formatCurrency(bonus), 'gift', 'Acumulado', 'success')}
      ${statCard('Saldo Total', formatCurrency(balance), 'dollar-sign', 'Acumulado', 'success')}
      ${statCard('Erros', errors, 'alert-circle', 'Total de falhas', 'error')}
    `

    const platforms = stats.by_platform ?? stats.platforms ?? []
    const platformEl = document.getElementById('platform-table')
    if (Array.isArray(platforms) && platforms.length > 0) {
      platformEl.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Plataforma</th>
                <th>Contas</th>
                <th>Bônus</th>
                <th>Saldo</th>
                <th>Erros</th>
              </tr>
            </thead>
            <tbody>
              ${platforms.map(p => `
                <tr>
                  <td><span class="badge badge-platform">${p.platform ?? p.name ?? '-'}</span></td>
                  <td>${p.count ?? p.total ?? 0}</td>
                  <td style="color:var(--success)">${formatCurrency(p.bonus ?? p.total_bonus ?? 0)}</td>
                  <td style="color:var(--success)">${formatCurrency(p.balance ?? p.total_balance ?? 0)}</td>
                  <td style="color:var(--error)">${p.errors ?? 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    } else {
      platformEl.innerHTML = '<div class="table-empty">Nenhum dado por plataforma ainda.</div>'
    }

    const recentEl = document.getElementById('recent-accounts')
    const recent = Array.isArray(accounts) ? accounts : (accounts.accounts ?? [])
    if (recent.length > 0) {
      recentEl.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Plataforma</th>
                <th>Usuário</th>
                <th>Bônus</th>
                <th>Saldo</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${recent.map(a => `
                <tr>
                  <td style="font-family:var(--mono);font-size:12px;color:var(--text-dim)">${a.id ?? '-'}</td>
                  <td><span class="badge badge-platform">${a.platform ?? '-'}</span></td>
                  <td>${a.username ?? a.user ?? '-'}</td>
                  <td style="color:var(--success)">${formatCurrency(a.bonus ?? 0)}</td>
                  <td style="color:var(--success)">${formatCurrency(a.balance ?? 0)}</td>
                  <td style="color:var(--text-dim)">${formatDate(a.created_at ?? a.date ?? a.timestamp)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    } else {
      recentEl.innerHTML = '<div class="table-empty">Nenhuma conta registrada ainda.</div>'
    }
  } catch (err) {
    document.getElementById('stats-grid').innerHTML = ''
    document.getElementById('platform-table').innerHTML = `<div class="table-empty" style="color:var(--error)">Erro ao carregar: ${err.message}</div>`
    document.getElementById('recent-accounts').innerHTML = ''
    toast(`Erro ao carregar dashboard: ${err.message}`, 'error')
  }
}

function statCard(label, value, icon, sub, variant) {
  return `
    <div class="stat-card ${variant}">
      <div class="stat-card-header">
        <span class="stat-card-label">${label}</span>
        <div class="stat-card-icon ${variant}">${createIconWrapped(icon, 18)}</div>
      </div>
      <div class="stat-card-value">${value}</div>
      <div class="stat-card-sub">${sub}</div>
    </div>
  `
}

function createIconWrapped(name, size) {
  const paths = ICONS[name] || ICONS['info']
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths.map(d => `<path d="${d}"/>`).join('')}</svg>`
}
