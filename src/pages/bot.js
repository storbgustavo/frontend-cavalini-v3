import { api } from '../api.js'
import { toast, formatCurrency } from '../utils.js'

let statusPoll = null
let platforms = []

export async function renderBot(contentEl) {
  contentEl.innerHTML = `
    <div class="page">
      <div class="bot-control-card" id="bot-control">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
      <div class="bot-stats-row" id="bot-stats-row"></div>
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Configuração da Execução</span>
        </div>
        <div class="panel-body">
          <form id="bot-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Plataforma</label>
              <select class="form-select" name="platform" id="bot-platform" required></select>
            </div>
            <div class="form-group">
              <label class="form-label">Quantidade de Contas</label>
              <input class="form-input" type="number" name="count" min="1" value="10" required />
            </div>
            <div class="form-group">
              <label class="form-label">Execuções Paralelas</label>
              <input class="form-input" type="number" name="parallel" min="1" max="20" value="3" required />
            </div>
            <div class="form-group">
              <label class="form-label">Jogo</label>
              <input class="form-input" type="text" name="game" placeholder="ex: fortune_tiger" />
            </div>
            <div class="form-group">
              <label class="form-label">Meta (R$)</label>
              <input class="form-input" type="number" name="target" min="0" step="0.01" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Aposta Máxima (R$)</label>
              <input class="form-input" type="number" name="bet_max" min="0" step="0.01" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de PIX</label>
              <select class="form-select" name="pix_type">
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="random">Aleatório</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">GeeToken Individual</label>
              <label class="toggle">
                <input type="checkbox" name="gee_token_individual" />
                <span class="toggle-track"></span>
                <span class="toggle-label">Usar geeToken individual por conta</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">SMS</label>
              <label class="toggle">
                <input type="checkbox" name="sms" checked />
                <span class="toggle-track"></span>
                <span class="toggle-label">Ativar verificação por SMS</span>
              </label>
            </div>
            <div class="form-group full" style="flex-direction:row;gap:12px;align-items:flex-end;margin-top:8px">
              <button type="submit" class="btn btn-success" id="bot-start-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
                Iniciar Bot
              </button>
              <button type="button" class="btn btn-danger" id="bot-stop-btn" style="display:none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                Parar Bot
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  try {
    const p = await api.getPlatforms()
    platforms = Array.isArray(p) ? p : (p.platforms ?? [])
    const sel = document.getElementById('bot-platform')
    platforms.forEach(pl => {
      const name = typeof pl === 'string' ? pl : (pl.name ?? pl.platform ?? pl)
      const opt = document.createElement('option')
      opt.value = name
      opt.textContent = name
      sel.appendChild(opt)
    })
  } catch {
    // continue without platforms
  }

  document.getElementById('bot-form').addEventListener('submit', handleStart)
  document.getElementById('bot-stop-btn').addEventListener('click', handleStop)

  await refreshStatus()
  startPolling()
}

async function refreshStatus() {
  const controlEl = document.getElementById('bot-control')
  if (!controlEl) return

  try {
    const status = await api.getBotStatus()
    const running = status.running ?? false
    const stats = status.stats ?? {}
    const currentAccount = status.current_account

    controlEl.innerHTML = `
      <div class="bot-control-info">
        <div class="bot-control-status ${running ? 'running' : ''}">
          ${running
            ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>'
            : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
          }
        </div>
        <div class="bot-control-text">
          <h3>${running ? 'Bot em Execução' : 'Bot Parado'}</h3>
          <p>${currentAccount ? `Processando: ${currentAccount}` : (running ? 'Aguardando próxima conta...' : 'Pronto para iniciar')}</p>
        </div>
      </div>
      <div class="bot-control-actions">
        <button class="btn btn-success" id="bot-start-inline" ${running ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
          Iniciar
        </button>
        <button class="btn btn-danger" id="bot-stop-inline" ${!running ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          Parar
        </button>
      </div>
    `

    document.getElementById('bot-start-inline').addEventListener('click', () => {
      if (!running) document.getElementById('bot-form').requestSubmit()
    })
    document.getElementById('bot-stop-inline').addEventListener('click', handleStop)

    document.getElementById('bot-start-btn').style.display = running ? 'none' : ''
    document.getElementById('bot-stop-btn').style.display = running ? '' : 'none'

    const statsRow = document.getElementById('bot-stats-row')
    if (statsRow) {
      statsRow.innerHTML = `
        <div class="bot-stat"><div class="bot-stat-value">${stats.total ?? stats.processed ?? 0}</div><div class="bot-stat-label">Processadas</div></div>
        <div class="bot-stat"><div class="bot-stat-value">${stats.success ?? 0}</div><div class="bot-stat-label">Sucesso</div></div>
        <div class="bot-stat"><div class="bot-stat-value">${stats.errors ?? stats.failed ?? 0}</div><div class="bot-stat-label">Erros</div></div>
        <div class="bot-stat"><div class="bot-stat-value">${formatCurrency(stats.bonus ?? 0)}</div><div class="bot-stat-label">Bônus Gerado</div></div>
      `
    }
  } catch {
    controlEl.innerHTML = `
      <div class="bot-control-info">
        <div class="bot-control-status">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <div class="bot-control-text">
          <h3>Bot Parado</h3>
          <p>Backend offline ou não respondendo</p>
        </div>
      </div>
    `
  }
}

async function handleStart(e) {
  e.preventDefault()
  const form = e.target
  const fd = new FormData(form)
  const body = {}
  for (const [k, v] of fd.entries()) {
    if (k === 'count' || k === 'parallel') {
      body[k] = parseInt(v)
    } else if (k === 'target' || k === 'bet_max') {
      body[k] = parseFloat(v)
    } else if (k === 'sms' || k === 'gee_token_individual') {
      body[k] = fd.get(k) === 'on'
    } else {
      body[k] = v
    }
  }

  try {
    await api.startBot(body)
    toast('Bot iniciado com sucesso!', 'success')
    await refreshStatus()
  } catch (err) {
    toast(`Erro ao iniciar bot: ${err.message}`, 'error')
  }
}

async function handleStop() {
  try {
    await api.stopBot()
    toast('Bot parado.', 'info')
    await refreshStatus()
  } catch (err) {
    toast(`Erro ao parar bot: ${err.message}`, 'error')
  }
}

function startPolling() {
  stopPolling()
  statusPoll = setInterval(refreshStatus, 5000)
}

export function stopPolling() {
  if (statusPoll) {
    clearInterval(statusPoll)
    statusPoll = null
  }
}
