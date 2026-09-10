import { api } from '../api.js'
import { toast } from '../utils.js'

export async function renderConfig(contentEl) {
  contentEl.innerHTML = `
    <div class="page">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
  `

  let config = {}
  try {
    config = await api.getConfig()
  } catch (err) {
    toast(`Erro ao carregar configuração: ${err.message}`, 'error')
  }

  contentEl.innerHTML = `
    <div class="page">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Configuração de Proxy</span>
        </div>
        <div class="panel-body">
          <form id="proxy-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Proxy URL</label>
              <input class="form-input" type="text" name="proxy_url" value="${config.proxy_url ?? config.proxy ?? ''}" placeholder="http://user:pass@host:port" />
              <span class="form-hint">URL completa do proxy (opcional)</span>
            </div>
            <div class="form-group">
              <label class="form-label">Proxy Ativo</label>
              <label class="toggle">
                <input type="checkbox" name="proxy_enabled" ${config.proxy_enabled ?? config.proxy_active ? 'checked' : ''} />
                <span class="toggle-track"></span>
                <span class="toggle-label">Usar proxy nas requisições</span>
              </label>
            </div>
            <div class="form-group full">
              <button type="submit" class="btn btn-primary">Salvar Proxy</button>
            </div>
          </form>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Configuração de SMS</span>
          <button class="btn btn-ghost btn-sm" id="check-sms-balance">Verificar Saldo</button>
        </div>
        <div class="panel-body">
          <form id="sms-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">SMS API Key</label>
              <input class="form-input" type="text" name="sms_api_key" value="${config.sms_api_key ?? ''}" placeholder="Sua chave de API do serviço SMS" />
            </div>
            <div class="form-group">
              <label class="form-label">SMS API URL</label>
              <input class="form-input" type="text" name="sms_api_url" value="${config.sms_api_url ?? ''}" placeholder="https://api.sms-service.com" />
            </div>
            <div class="form-group">
              <label class="form-label">País</label>
              <input class="form-input" type="text" name="sms_country" value="${config.sms_country ?? 'br'}" placeholder="br" />
            </div>
            <div class="form-group">
              <label class="form-label">Saldo Atual</label>
              <div id="sms-balance-display" style="padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;color:var(--text-dim)">
                Clique em "Verificar Saldo"
              </div>
            </div>
            <div class="form-group full">
              <button type="submit" class="btn btn-primary">Salvar SMS</button>
            </div>
          </form>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Configurações Gerais</span>
        </div>
        <div class="panel-body">
          <form id="general-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Tempo de Espera (segundos)</label>
              <input class="form-input" type="number" name="wait_time" min="0" value="${config.wait_time ?? 30}" />
            </div>
            <div class="form-group">
              <label class="form-label">Tentativas Máximas</label>
              <input class="form-input" type="number" name="max_retries" min="1" value="${config.max_retries ?? 3}" />
            </div>
            <div class="form-group">
              <label class="form-label">Headless</label>
              <label class="toggle">
                <input type="checkbox" name="headless" ${config.headless !== false ? 'checked' : ''} />
                <span class="toggle-track"></span>
                <span class="toggle-label">Executar navegador em modo headless</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">Debug Mode</label>
              <label class="toggle">
                <input type="checkbox" name="debug" ${config.debug ? 'checked' : ''} />
                <span class="toggle-track"></span>
                <span class="toggle-label">Ativar logs detalhados</span>
              </label>
            </div>
            <div class="form-group full">
              <button type="submit" class="btn btn-primary">Salvar Configurações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  document.getElementById('proxy-form').addEventListener('submit', (e) => handleSubmit(e, ['proxy_url', 'proxy_enabled']))
  document.getElementById('sms-form').addEventListener('submit', (e) => handleSubmit(e, ['sms_api_key', 'sms_api_url', 'sms_country']))
  document.getElementById('general-form').addEventListener('submit', (e) => handleSubmit(e, ['wait_time', 'max_retries', 'headless', 'debug']))
  document.getElementById('check-sms-balance').addEventListener('click', checkBalance)
}

async function handleSubmit(e, fields) {
  e.preventDefault()
  const fd = new FormData(e.target)
  const body = {}
  fields.forEach(f => {
    const v = fd.get(f)
    if (v === null) {
      body[f] = false
    } else if (f === 'wait_time' || f === 'max_retries') {
      body[f] = parseInt(v)
    } else {
      body[f] = v
    }
  })

  try {
    await api.updateConfig(body)
    toast('Configuração salva com sucesso!', 'success')
  } catch (err) {
    toast(`Erro ao salvar: ${err.message}`, 'error')
  }
}

async function checkBalance() {
  const el = document.getElementById('sms-balance-display')
  if (!el) return
  el.textContent = 'Verificando...'
  el.style.color = 'var(--text-dim)'
  try {
    const data = await api.getSmsBalance()
    const balance = data.balance ?? data.amount ?? data.credit ?? 'N/A'
    el.textContent = `Saldo: ${balance}`
    el.style.color = 'var(--success)'
  } catch (err) {
    el.textContent = `Erro: ${err.message}`
    el.style.color = 'var(--error)'
  }
}
