// UIDashboard.js - Maneja la interfaz principal del dashboard del cliente, mostrando su información, cuentas y permitiendo realizar operaciones bancarias
class UIDashboard {
  #auth; #banco; #onLogout; #currentPanel = 'panel-saldo';
// El constructor recibe el servicio de autenticación, el banco y una función de callback para cerrar sesión, y luego renderiza la interfaz del dashboard
  constructor(auth, banco, onLogout) {
    this.#auth    = auth;
    this.#banco   = banco;
    this.#onLogout= onLogout;
  }
// El método render() se encarga de mostrar toda la información del cliente en el dashboard, incluyendo su nombre, cuentas, saldo, etc., y también de configurar los eventos de navegación entre paneles y cierre de sesión
  render() {
    this.#renderTopbar();
    this.#renderSidebar();
    this.#renderAccountTabs();
    this.#renderBalanceCard();
    this.#bindNav();
    this.#showPanel('panel-saldo');
  }
// El método #renderTopbar() muestra un saludo personalizado al cliente, la fecha actual y su avatar (iniciales de su nombre), y también configura el evento del botón de cerrar sesión
  // ─── TOPBAR ──────────────────────────────────────────────
  #renderTopbar() {
    const c    = this.#auth.getClienteActivo();
    const name = c.getNombreCompleto();
    const first = name.split(' ')[0];
    const h    = new Date().getHours();
    const sal  = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
// Formateamos la fecha actual en español (Colombia) con el formato "Día de la semana, día de mes de año"
    const now     = new Date();
    const dateStr = now.toLocaleDateString('es-CO', {
      weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
// Actualizamos los elementos del topbar con el saludo, fecha y avatar, y configuramos el evento del botón de cerrar sesión
    const el = id => document.getElementById(id);
    if (el('topbar-greeting')) el('topbar-greeting').textContent = `${sal}, ${first}`;
    if (el('topbar-date'))     el('topbar-date').textContent     = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    if (el('topbar-avatar'))   el('topbar-avatar').textContent   = UIHelpers.initials(name);
    if (el('topbar-name'))     el('topbar-name').textContent     = name;
    el('topbar-logout')?.addEventListener('click', () => this.#onLogout());
  }
// El método #renderSidebar() muestra la información del cliente en la barra lateral, incluyendo su avatar, nombre completo e identificación, y también configura el evento del botón de cerrar sesión
  // ─── SIDEBAR ─────────────────────────────────────────────
  #renderSidebar() {
    const c = this.#auth.getClienteActivo();
    document.getElementById('sidebar-avatar').textContent = UIHelpers.initials(c.getNombreCompleto());
    document.getElementById('sidebar-name').textContent   = c.getNombreCompleto();
    document.getElementById('sidebar-id').textContent     = `ID: ${c.getIdentificacion()}`;
  }
// El método #renderAccountTabs() muestra las pestañas de las cuentas del cliente en la parte superior del dashboard, permitiendo cambiar entre ellas para ver su información y realizar operaciones, y también muestra botones para abrir nuevas cuentas o solicitar tarjeta de crédito si el cliente no las tiene
  // ─── ACCOUNT TABS ─────────────────────────────────────────
  #renderAccountTabs() {
    const cliente  = this.#auth.getClienteActivo();
    const cuentas  = cliente.getCuentas();
    const container= document.getElementById('account-tabs');
    container.innerHTML = '';
// Para cada cuenta del cliente, creamos un botón que al hacer clic activa esa cuenta y muestra su información en el dashboard
    cuentas.forEach((cuenta, i) => {
      const btn = document.createElement('button');
      btn.className = `account-tab${i === 0 ? ' active' : ''}`;
      btn.textContent = `${cuenta.getTipo()} · ${cuenta.getNumeroCuenta()}`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.account-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.#auth.setCuentaActiva(cuenta);
        this.#renderBalanceCard();
        this.#showPanel(this.#currentPanel);
      });
      container.appendChild(btn);
    });

    // Botones apertura AH / CC
    const tieneAH = cuentas.some(c => c instanceof CuentaAhorros);
    const tieneCC = cuentas.some(c => c instanceof CuentaCorriente);
// Si el cliente no tiene una cuenta de ahorros o corriente, mostramos un botón para abrirla; si no tiene tarjeta de crédito, mostramos un botón para solicitarla
    if (!tieneAH) {
      const btnAH = document.createElement('button');
      btnAH.className = 'btn-solicitar-tc';
      btnAH.innerHTML = `${Icons.plus} Abrir Cuenta de Ahorros`;
      btnAH.addEventListener('click', () => this.#abrirCuenta('AH'));
      container.appendChild(btnAH);
    }
    if (!tieneCC) {
      const btnCC = document.createElement('button');
      btnCC.className = 'btn-solicitar-tc';
      btnCC.innerHTML = `${Icons.plus} Abrir Cuenta Corriente`;
      btnCC.addEventListener('click', () => this.#abrirCuenta('CC'));
      container.appendChild(btnCC);
    }
    if (!cliente.tieneTarjetaCredito()) {
      const btnTC = document.createElement('button');
      btnTC.className = 'btn-solicitar-tc';
      btnTC.innerHTML = `${Icons.plus} Solicitar Tarjeta de Crédito`;
      btnTC.addEventListener('click', () => this.#solicitarTC());
      container.appendChild(btnTC);
    }
  }
// El método #abrirCuenta(tipo) muestra un modal de confirmación para abrir una nueva cuenta (Ahorros o Corriente) y, si el cliente confirma, realiza la apertura de la cuenta a través del servicio del banco, actualiza la interfaz y activa la nueva cuenta
  #abrirCuenta(tipo) {
    const nombre = tipo === 'AH' ? 'Cuenta de Ahorros' : 'Cuenta Corriente';
    const desc   = tipo === 'AH'
      ? 'Sin cuota de manejo, con rendimiento del <strong style="color:var(--green)">1.5% mensual</strong>.'
      : 'Con sobregiro del <strong style="color:var(--gold)">20%</strong> y transferencias sin límite.';
    UIHelpers.showModal(`
      <h3>Abrir ${nombre}</h3>
      <p>${desc}</p>
      <p style="margin-top:8px;color:var(--w60);font-size:13px">La cuenta se abrirá con saldo $0. Puede consignar dinero inmediatamente.</p>
      <div class="modal-actions">
        <button class="btn-cancel" id="modal-cancel">Cancelar</button>
        <button class="btn-action" id="modal-confirm" style="width:auto;padding:10px 24px">Confirmar apertura</button>
      </div>`,
      () => {
        try {
          const cuenta = this.#banco.abrirCuenta(this.#auth.getClienteActivo().getId(), tipo);
          UIHelpers.closeModal();
          this.#auth.setCuentaActiva(cuenta);
          this.#renderAccountTabs();
          this.#renderBalanceCard();
          this.#showPanel('panel-saldo');
          const tabs = document.querySelectorAll('.account-tab');
          tabs.forEach(t => t.classList.remove('active'));
          // Activar el tab de la nueva cuenta
          const nuevo = [...tabs].find(t => t.textContent.includes(cuenta.getNumeroCuenta()));
          if (nuevo) nuevo.classList.add('active');
        } catch(e) { UIHelpers.closeModal(); alert(e.message); }
      }
    );
  }
// El método
  #solicitarTC() {
    UIHelpers.showModal(`
      <h3>Solicitud de Tarjeta de Crédito</h3>
      <p>Al confirmar, se aprobará de forma inmediata una Tarjeta de Crédito con cupo de <strong style="color:var(--gold)">${UIHelpers.fmt(TarjetaCredito.CUPO_MAXIMO)}</strong>.</p>
      <div class="modal-actions">
        <button class="btn-cancel" id="modal-cancel">Cancelar</button>
        <button class="btn-action" id="modal-confirm" style="width:auto;padding:10px 24px">Confirmar solicitud</button>
      </div>`,
      () => {
        try {
          const tc = this.#banco.solicitarTarjetaCredito(this.#auth.getClienteActivo().getId());
          UIHelpers.closeModal();
          this.#auth.setCuentaActiva(tc);
          this.#renderAccountTabs();
          this.#renderBalanceCard();
          this.#showPanel('panel-saldo');
          // Marcar tab activo a la TC
          const tabs = document.querySelectorAll('.account-tab');
          tabs.forEach(t => t.classList.remove('active'));
          if (tabs.length) tabs[tabs.length - 1].classList.add('active');
        } catch(e) { UIHelpers.closeModal(); alert(e.message); }
      }
    );
  }
// El método #renderBalanceCard() muestra la información del saldo o cupo disponible de la cuenta activa, adaptando el contenido según el tipo de cuenta (Ahorros, Corriente o Tarjeta de Crédito) y mostrando detalles adicionales como tasa de interés, límite de sobregiro o deuda actual
  // ─── BALANCE CARD ─────────────────────────────────────────
  #renderBalanceCard() {
    const cuenta = this.#auth.getCuentaActiva();
    if (!cuenta) return;
    const fmt = UIHelpers.fmt;
// Adaptamos el contenido de la tarjeta de balance según el tipo de cuenta, mostrando el saldo disponible para Ahorros y Corriente, o el cupo disponible para Tarjeta de Crédito, y también mostrando detalles adicionales relevantes para cada tipo de cuenta
    let label = 'Saldo disponible', amount, meta = '';
// Para Tarjeta de Crédito mostramos el cupo disponible, el cupo total y la deuda actual; para Cuenta Corriente mostramos el saldo disponible y el límite con sobregiro; para Cuenta de Ahorros mostramos el saldo disponible y la tasa de interés
    if (cuenta instanceof TarjetaCredito) {
      label  = 'Cupo disponible';
      amount = fmt(cuenta.getCupoDisponible());
      meta   = `
        <div class="balance-meta-item"><div class="meta-label">Cupo total</div><div class="meta-value">${fmt(cuenta.getCupo())}</div></div>
        <div class="balance-meta-item"><div class="meta-label">Deuda con intereses</div><div class="meta-value" style="color:#e74c3c">${fmt(cuenta.getDeudaConIntereses())}</div></div>`;
    } else if (cuenta instanceof CuentaCorriente) {
      amount = fmt(cuenta.getSaldo());
      meta   = `<div class="balance-meta-item"><div class="meta-label">Límite con sobregiro</div><div class="meta-value">${fmt(cuenta.getLimiteRetiro())}</div></div>`;
    } else {
      amount = fmt(cuenta.getSaldo());
      meta   = `<div class="balance-meta-item"><div class="meta-label">Tasa de interés</div><div class="meta-value">1.5% mensual</div></div>`;
    }
// Actualizamos los elementos de la tarjeta de balance con la información formateada correspondiente a la cuenta activa
    document.getElementById('balance-label').textContent      = label;
    document.getElementById('balance-amount').textContent     = amount;
    document.getElementById('balance-account-num').textContent= `${cuenta.getTipo()} · Nro. ${cuenta.getNumeroCuenta()}`;
    document.getElementById('balance-meta').innerHTML         = meta;
  }
// El método #bindNav() configura los eventos de navegación entre los diferentes paneles del dashboard (Saldo, Consignar, Retirar, Transferir, Movimientos, Perfil) y también el evento del botón de cerrar sesión, mostrando un modal de confirmación antes de cerrar la sesión actual
  // ─── NAVEGACIÓN ───────────────────────────────────────────
  #bindNav() {
    document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        this.#showPanel(item.dataset.panel);
      });
    });
    document.getElementById('btn-logout').addEventListener('click', () => {
      UIHelpers.showModal(`
        <h3>Cerrar sesión</h3>
        <p>¿Está seguro que desea cerrar la sesión actual?</p>
        <div class="modal-actions">
          <button class="btn-cancel" id="modal-cancel">Cancelar</button>
          <button class="btn-action danger" id="modal-confirm" style="width:auto;padding:10px 24px">Cerrar sesión</button>
        </div>`,
        () => { UIHelpers.closeModal(); this.#onLogout(); }
      );
    });
  }
// El método #showPanel(panelId) muestra el panel correspondiente al ID proporcionado, ocultando los demás, y también llama a la función de renderizado específica para ese panel (Saldo, Consignar, Retirar, Transferir, Movimientos, Perfil) para actualizar su contenido con la información de la cuenta activa
  #showPanel(panelId) {
    this.#currentPanel = panelId;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
    const renders = {
      'panel-saldo':       () => this.#renderSaldo(),
      'panel-consignar':   () => this.#renderConsignar(),
      'panel-retirar':     () => this.#renderRetirar(),
      'panel-transferir':  () => this.#renderTransferir(),
      'panel-movimientos': () => this.#renderMovimientos(),
      'panel-perfil':      () => this.#renderPerfil(),
    };
    if (renders[panelId]) renders[panelId]();
  }
// El método #renderSaldo() muestra la información del saldo o cupo disponible de la cuenta activa, adaptando el contenido según el tipo de cuenta (Ahorros, Corriente o Tarjeta de Crédito) y mostrando detalles adicionales como tasa de interés, límite de sobregiro o deuda actual, y también muestra opciones específicas para cada tipo de cuenta (realizar compra o pagar deuda para Tarjeta de Crédito)
  // ─── SALDO ────────────────────────────────────────────────
  #renderSaldo() {
    const cuenta     = this.#auth.getCuentaActiva();
    const fmt        = UIHelpers.fmt;
    const container  = document.getElementById('saldo-content');
    const movs       = cuenta.obtenerMovimientos();
    const totalMovs  = movs.length;
    const ultimoMov  = totalMovs > 0 ? movs[totalMovs - 1].toObject() : null;
// Adaptamos el contenido de la tarjeta de balance según el tipo de cuenta, mostrando el saldo disponible para Ahorros y Corriente, o el cupo disponible para Tarjeta de Crédito, y también mostrando detalles adicionales relevantes para cada tipo de cuenta; además, para Tarjeta de Crédito se muestran opciones para realizar una compra o pagar la deuda actual
    if (cuenta instanceof TarjetaCredito) {
      const cliente      = this.#auth.getClienteActivo();
      const cuentasOrigen= cliente.getCuentas().filter(c => !(c instanceof TarjetaCredito));
      const compras           = cuenta.getCompras();
      const deudaConIntereses = cuenta.getDeudaConIntereses();

      const pagoMinimo = compras.reduce((s, c) => c.cuotasPagadas < c.cuotas ? s + c.cuotaMensual : s, 0);

      const opcionesCuotas = compras.map((c, idx) => {
        const restantes   = c.cuotas - c.cuotasPagadas;
        const cuotasItems = Array.from({ length: c.cuotas }, (_, i) => {
          const num    = i + 1;
          const pagada = i < c.cuotasPagadas;
          return pagada
            ? `<option disabled>✓ Cuota ${num} — CANCELADA</option>`
            : `<option value="cuota_${c.id}_1">Cuota ${num} — ${fmt(c.cuotaMensual)}</option>`;
        }).join('');
        const totalOpt = restantes > 0
          ? `<option value="tc_${c.id}_all">Cancelar compra completa (${restantes} cuota(s)) — ${fmt(c.cuotaMensual * restantes)}</option>`
          : `<option disabled>✓ Compra totalmente cancelada</option>`;
        return `<optgroup label="Compra #${idx + 1}: ${fmt(c.monto)} · ${c.cuotasPagadas}/${c.cuotas} pagadas">${cuotasItems}${totalOpt}</optgroup>`;
      }).join('');

      const origenOpts = cuentasOrigen.length
        ? cuentasOrigen.map(c => `<option value="${c.getNumeroCuenta()}">${c.getTipo()} · ${c.getNumeroCuenta()} — Saldo: ${fmt(c.getSaldo())}</option>`).join('')
        : '<option disabled>Sin cuentas disponibles</option>';

      container.innerHTML = `
        <div class="op-card">
          <h4>Realizar compra</h4>
          <div class="form-group"><label>Monto de la compra (COP)</label>
            <input id="tc-monto" class="form-control" type="number" min="1" placeholder="Ej: 500.000">
          </div>
          <div class="form-group"><label>Número de cuotas</label>
            <select id="tc-cuotas" class="form-control">
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>`<option value="${n}">${n} cuota${n>1?'s':''}</option>`).join('')}
            </select>
          </div>
          <div id="cuota-preview" class="cuota-preview hidden"></div>
          <button class="btn-action" id="btn-comprar" style="margin-top:14px">Procesar compra</button>
          <div id="tc-alert" class="hidden" style="margin-top:12px"></div>
        </div>
        <div class="op-card">
          <h4>Pagar deuda</h4>
          <div class="form-group"><label>Pagar desde</label>
            <select id="tc-pago-origen" class="form-control">${origenOpts}</select>
          </div>
          <div class="form-group"><label>Tipo de pago</label>
            <select id="tc-pago-tipo" class="form-control">
              ${compras.filter(c => c.cuotasPagadas < c.cuotas).length > 1 ? `<option value="minimo">Pago mínimo (1 cuota por compra) — ${fmt(pagoMinimo)}</option>` : ''}
              ${opcionesCuotas}
              <option value="total">Cancelar deuda total (con intereses) — ${fmt(deudaConIntereses)}</option>
              <option value="otro">Otro valor</option>
            </select>
          </div>
          <div id="tc-pago-custom-wrap" class="form-group hidden">
            <label>Monto personalizado (COP)</label>
            <input id="tc-pago-monto" class="form-control" type="number" min="1" placeholder="Ej: 200.000">
          </div>
          <button class="btn-action" id="btn-pagar-tc">Realizar pago</button>
          <div id="tc-pago-alert" class="hidden" style="margin-top:12px"></div>
        </div>`;
// Configuramos los eventos para calcular la cuota mensual en tiempo real al ingresar el monto y seleccionar las cuotas, y para procesar la compra o el pago de deuda al hacer clic en los botones correspondientes, mostrando mensajes de éxito o error según corresponda
      const updatePreview = () => {
        const monto  = parseFloat(document.getElementById('tc-monto').value);
        const cuotas = parseInt(document.getElementById('tc-cuotas').value);
        const prev   = document.getElementById('cuota-preview');
        if (!monto || monto <= 0) { prev.classList.add('hidden'); return; }
        const tasa  = cuenta.calcularTasa(cuotas);
        const cuota = cuenta.calcularCuotaMensual(monto, cuotas);
        prev.innerHTML = `
          <div class="cp-label">Pago mensual</div>
          <div class="cp-value">${fmt(cuota)}</div>
          <div class="cp-detail">Tasa: ${(tasa*100).toFixed(1)}% mensual · ${cuotas} cuota(s) · Total a pagar: ${fmt(cuota * cuotas)}</div>`;
        prev.classList.remove('hidden');
      };
      document.getElementById('tc-monto').addEventListener('input', updatePreview);
      document.getElementById('tc-cuotas').addEventListener('change', updatePreview);
// Evento para procesar la compra con tarjeta de crédito, validando el monto y las cuotas, y mostrando un mensaje de éxito con los detalles de la compra o un mensaje de error si la compra no se puede procesar
      document.getElementById('btn-comprar').addEventListener('click', () => {
        const monto  = parseFloat(document.getElementById('tc-monto').value);
        const cuotas = parseInt(document.getElementById('tc-cuotas').value);
        try {
          const r = cuenta.comprar(monto, cuotas);
          this.#banco.save();
          UIHelpers.showAlert('tc-alert', 'success', `Compra aprobada. Cuota mensual: ${fmt(r.cuotaMensual)}. Cupo disponible: ${fmt(r.cupoDisponible)}`);
          UIHelpers.autoHideAlert('tc-alert');
          this.#renderBalanceCard();
          document.getElementById('tc-monto').value = '';
          document.getElementById('cuota-preview').classList.add('hidden');
        } catch(e) { UIHelpers.showAlert('tc-alert', 'error', e.message); }
      });
// Evento para procesar el pago de la deuda de la tarjeta de crédito, validando el monto ingresado y mostrando un mensaje de éxito con el monto pagado y la deuda restante, o un mensaje de error si el pago no se puede procesar
      document.getElementById('tc-pago-tipo').addEventListener('change', (e) => {
        document.getElementById('tc-pago-custom-wrap').classList.toggle('hidden', e.target.value !== 'otro');
      });

      document.getElementById('btn-pagar-tc').addEventListener('click', () => {
        const tipoSel  = document.getElementById('tc-pago-tipo').value;
        const numOrigen= document.getElementById('tc-pago-origen').value;
        const origen   = cliente.getCuentaPorNumero(numOrigen);
        if (!origen) { UIHelpers.showAlert('tc-pago-alert','error','Seleccione una cuenta de origen válida.'); return; }
        let monto;
        if (tipoSel === 'total') {
          monto = deudaConIntereses;
        } else if (tipoSel === 'minimo') {
          monto = pagoMinimo;
        } else if (tipoSel === 'otro') {
          monto = parseFloat(document.getElementById('tc-pago-monto').value);
        } else if (tipoSel.startsWith('tc_')) {
          // tc_<id>_all → pagar todas las cuotas restantes de esa compra
          const id = parseInt(tipoSel.split('_')[1]);
          const c  = compras.find(x => x.id === id);
          if (!c) { UIHelpers.showAlert('tc-pago-alert','error','Compra no encontrada.'); return; }
          monto = c.cuotaMensual * (c.cuotas - c.cuotasPagadas);
        } else if (tipoSel.startsWith('cuota_')) {
          // cuota_<id>_1 → pagar 1 cuota de esa compra
          const id = parseInt(tipoSel.split('_')[1]);
          const c  = compras.find(x => x.id === id);
          if (!c) { UIHelpers.showAlert('tc-pago-alert','error','Compra no encontrada.'); return; }
          monto = c.cuotaMensual;
        } else {
          UIHelpers.showAlert('tc-pago-alert','error','Seleccione una opción de pago válida.'); return;
        }
        try {
          origen.transferir(cuenta, monto);
          this.#banco.save();
          UIHelpers.showAlert('tc-pago-alert', 'success', `Pago de ${fmt(monto)} aplicado. Cupo disponible: ${fmt(cuenta.getCupoDisponible())} · Deuda restante: ${fmt(cuenta.getDeudaConIntereses())}`);
          UIHelpers.autoHideAlert('tc-pago-alert');
          this.#renderBalanceCard();
          this.#renderSaldo();
        } catch(e) { UIHelpers.showAlert('tc-pago-alert', 'error', e.message); }
      });
// Para Cuenta de Ahorros y Corriente mostramos el saldo disponible, la tasa de interés o el límite con sobregiro, y también información sobre los movimientos registrados en la cuenta, incluyendo la fecha del último movimiento o un mensaje indicando que no hay movimientos aún
    } else if (cuenta instanceof CuentaAhorros) {
      const saldo       = cuenta.getSaldo();
      const interes     = cuenta.calcularIntereses(saldo);
      const ultimaFecha = ultimoMov ? ultimoMov.fechaHora : '—';
// Mostramos el saldo disponible, la tasa de rendimiento, el interés proyectado si se retira el saldo completo, y el número de movimientos registrados con la fecha del último movimiento o un mensaje indicando que no hay movimientos aún; también se muestra una información adicional explicando cómo funciona el rendimiento mensual
      container.innerHTML = `
        <div class="saldo-section">
          <div class="saldo-section-title">Resumen de cuenta</div>
          <div class="saldo-stats">
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon">${Icons.wallet}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Saldo disponible</div>
                <div class="saldo-stat-value c-green">${fmt(saldo)}</div>
                <div class="saldo-stat-hint">Nro. ${cuenta.getNumeroCuenta()}</div>
              </div>
            </div>
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon gold">${Icons.trending}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Tasa de rendimiento</div>
                <div class="saldo-stat-value c-gold">1.5% mensual</div>
                <div class="saldo-stat-hint">Aplicado en cada retiro</div>
              </div>
            </div>
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon">${Icons.chart}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Rendimiento proyectado</div>
                <div class="saldo-stat-value c-green">${fmt(interes)}</div>
                <div class="saldo-stat-hint">Se acredita en su próximo retiro</div>
              </div>
            </div>
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon">${Icons.history}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Movimientos registrados</div>
                <div class="saldo-stat-value">${totalMovs}</div>
                <div class="saldo-stat-hint">${ultimoMov ? 'Último: ' + ultimaFecha : 'Sin movimientos aún'}</div>
              </div>
            </div>
          </div>
          <div class="info-box info">${Icons.shield}<span>El rendimiento del <strong>1.5% mensual</strong> se descuenta automáticamente junto con cada retiro. Mientras más ahorre y menos retire, mayor será su saldo neto.</span></div>
        </div>`;
// Para Cuenta Corriente mostramos el saldo disponible, el sobregiro disponible (20% del saldo), el total disponible para retirar (saldo + sobregiro), y también información sobre los movimientos registrados en la cuenta, incluyendo la fecha del último movimiento o un mensaje indicando que no hay movimientos aún; además se muestra una información adicional explicando cómo funciona el sobregiro y cuál es el límite total disponible para retiros
    } else if (cuenta instanceof CuentaCorriente) {
      const saldo       = cuenta.getSaldo();
      const sobregiro   = saldo * cuenta.getPorcentajeSobregiro();
      const totalDisp   = cuenta.getLimiteRetiro();
      const ultimaFecha = ultimoMov ? ultimoMov.fechaHora : '—';
// Mostramos el saldo disponible, el sobregiro disponible (20% del saldo), el total disponible para retirar (saldo + sobregiro), y el número de movimientos registrados con la fecha del último movimiento o un mensaje indicando que no hay movimientos aún; también se muestra una información adicional explicando cómo funciona el sobregiro y cuál es el límite total disponible para retiros
      container.innerHTML = `
        <div class="saldo-section">
          <div class="saldo-section-title">Resumen de cuenta</div>
          <div class="saldo-stats">
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon">${Icons.wallet}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Saldo actual</div>
                <div class="saldo-stat-value c-green">${fmt(saldo)}</div>
                <div class="saldo-stat-hint">Nro. ${cuenta.getNumeroCuenta()}</div>
              </div>
            </div>
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon gold">${Icons.card}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Sobregiro disponible (20%)</div>
                <div class="saldo-stat-value c-gold">${fmt(sobregiro)}</div>
                <div class="saldo-stat-hint">Crédito adicional automático</div>
              </div>
            </div>
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon">${Icons.safe}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Total disponible para retirar</div>
                <div class="saldo-stat-value">${fmt(totalDisp)}</div>
                <div class="saldo-stat-hint">Saldo + sobregiro 20%</div>
              </div>
            </div>
            <div class="saldo-stat-card">
              <div class="saldo-stat-icon">${Icons.history}</div>
              <div class="saldo-stat-body">
                <div class="saldo-stat-label">Movimientos registrados</div>
                <div class="saldo-stat-value">${totalMovs}</div>
                <div class="saldo-stat-hint">${ultimoMov ? 'Último: ' + ultimaFecha : 'Sin movimientos aún'}</div>
              </div>
            </div>
          </div>
          <div class="info-box info">${Icons.shield}<span>El sobregiro le permite retirar hasta un <strong>20% adicional</strong> sobre su saldo actual sin costo adicional. El límite total disponible es <strong>${fmt(totalDisp)}</strong>.</span></div>
        </div>`;
    }
  }
// El método #renderConsignar() muestra el formulario para realizar una consignación de dinero a la cuenta activa, permitiendo seleccionar la cuenta destino (si el cliente tiene varias cuentas elegibles) y el monto a consignar, y luego procesa la consignación al hacer clic en el botón correspondiente, mostrando mensajes de éxito o error según corresponda
  // ─── CONSIGNAR ────────────────────────────────────────────
  #renderConsignar() {
    const cliente     = this.#auth.getClienteActivo();
    const cuentaActiva= this.#auth.getCuentaActiva();
    const fmt         = UIHelpers.fmt;
// Filtramos las cuentas elegibles para consignar, que son las cuentas de ahorros y corriente, excluyendo las tarjetas de crédito; si no hay cuentas elegibles, mostramos un mensaje indicando que no se pueden realizar consignaciones
    const elegibles = cliente.getCuentas().filter(c => !(c instanceof TarjetaCredito) && c.getNumeroCuenta() !== cuentaActiva.getNumeroCuenta());

    if (elegibles.length === 0) {
      document.getElementById('consignar-content').innerHTML =
        `<div class="info-box warn">${Icons.alert}<span>No tiene otras cuentas disponibles para consignar. Abra una cuenta adicional para realizar esta operación.</span></div>`;
      return;
    }
// Creamos las opciones del select para elegir la cuenta destino, mostrando el tipo de cuenta, número y saldo actual, y marcando como seleccionada la cuenta activa por defecto; luego mostramos el formulario para ingresar el monto a consignar y el botón para procesar la consignación, junto con un contenedor para mostrar mensajes de éxito o error
    const options = elegibles.map(c =>
      `<option value="${c.getNumeroCuenta()}" ${c.getNumeroCuenta() === cuentaActiva.getNumeroCuenta() ? 'selected' : ''}>
        ${c.getTipo()} · ${c.getNumeroCuenta()} — Saldo: ${fmt(c.getSaldo())}
      </option>`
    ).join('');
// Mostramos el formulario para realizar la consignación, con un select para elegir la cuenta destino (si hay varias) y un input para ingresar el monto a consignar, junto con un botón para procesar la consignación y un contenedor para mostrar mensajes de éxito o error
    document.getElementById('consignar-content').innerHTML = `
      <div class="op-card">
        <h4>Consignar dinero</h4>
        <div class="form-group"><label>Cuenta destino</label>
          <select id="cons-cuenta" class="form-control">${options}</select>
        </div>
        <div class="form-group"><label>Monto a consignar (COP)</label>
          <input id="cons-monto" class="form-control" type="number" min="1" placeholder="Ej: 500.000">
        </div>
        <button class="btn-action" id="btn-consignar">Consignar</button>
        <div id="cons-alert" class="hidden" style="margin-top:12px"></div>
      </div>`;
// Configuramos el evento para procesar la consignación al hacer clic en el botón correspondiente, validando el monto ingresado y mostrando un mensaje de éxito con el nuevo saldo de la cuenta destino o un mensaje de error si la consignación no se puede procesar; además, actualizamos los labels del select con los nuevos saldos después de la consignación
    document.getElementById('btn-consignar').addEventListener('click', () => {
      const num   = document.getElementById('cons-cuenta').value;
      const monto = parseFloat(document.getElementById('cons-monto').value);
      const destino = cliente.getCuentaPorNumero(num);
      if (!destino) { UIHelpers.showAlert('cons-alert','error','Cuenta no encontrada.'); return; }
      try {
        cuentaActiva.transferir(destino, monto);
        this.#banco.save();
        UIHelpers.showAlert('cons-alert','success',
          `Consignación exitosa. Debitado de ${cuentaActiva.getTipo()}: ${fmt(monto)} · Nuevo saldo origen: ${fmt(cuentaActiva.getSaldo())} · Nuevo saldo ${destino.getTipo()}: ${fmt(destino.getSaldo())}`
        );
        UIHelpers.autoHideAlert('cons-alert');
        this.#renderBalanceCard();
        this.#renderAccountTabs();
        document.getElementById('cons-monto').value = '';
      } catch(e) { UIHelpers.showAlert('cons-alert','error',e.message); }
    });
  }
// El método #renderTransferir() muestra el formulario para realizar una transferencia de dinero desde la cuenta activa hacia otra cuenta, permitiendo elegir entre transferencias a cuentas propias o a terceros, y luego procesa la transferencia al hacer clic en el botón correspondiente, mostrando mensajes de éxito o error según corresponda; además, para transferencias a terceros se incluye una funcionalidad de verificación del número de cuenta destino antes de realizar la transferencia
  // ─── RETIRAR ──────────────────────────────────────────────
  #renderRetirar() {
    const cuenta = this.#auth.getCuentaActiva();
    const fmt    = UIHelpers.fmt;
    let infoHtml = '';
// Adaptamos el contenido del panel de retiro según el tipo de cuenta, mostrando información relevante para cada tipo de cuenta: para Cuenta de Ahorros se muestra la tasa de interés aplicada a los retiros; para Cuenta Corriente se muestra el límite de retiro con sobregiro; para Tarjeta de Crédito se muestra una advertencia indicando que no se pueden realizar retiros y que deben usar la opción de consultar saldo para realizar compras a cuotas
    if (cuenta instanceof CuentaAhorros) {
      infoHtml = `<div class="info-box info">${Icons.shield}<span>Tu cuenta genera un rendimiento del <strong>1.5% mensual</strong> sobre tu saldo. El rendimiento se acredita automáticamente en cada retiro.</span></div>`;
    } else if (cuenta instanceof CuentaCorriente) {
      infoHtml = `<div class="info-box warn">${Icons.alert}<span>Límite de retiro con sobregiro del 20%: <strong>${fmt(cuenta.getLimiteRetiro())}</strong></span></div>`;
    } else if (cuenta instanceof TarjetaCredito) {
      document.getElementById('retirar-content').innerHTML =
        `<div class="info-box warn">${Icons.alert}<span>Para la Tarjeta de Crédito, use la opción <strong>Consultar Saldo</strong> para realizar compras a cuotas.</span></div>`;
      return;
    }
// Mostramos el formulario para realizar el retiro, con un input para ingresar el monto a retirar y un botón para procesar el retiro, junto con un contenedor para mostrar mensajes de éxito o error; además, se muestra una información adicional relevante según el tipo de cuenta (interés aplicado para Ahorros, límite de retiro para Corriente)
    document.getElementById('retirar-content').innerHTML = `
      ${infoHtml}
      <div class="op-card">
        <h4>Retirar dinero</h4>
        <div class="form-group"><label>Monto a retirar (COP)</label>
          <input id="ret-monto" class="form-control" type="number" min="1" placeholder="Ej: 200.000">
        </div>
        <button class="btn-action" id="btn-retirar">Retirar</button>
        <div id="ret-alert" class="hidden" style="margin-top:12px"></div>
      </div>`;
// Configuramos el evento para procesar el retiro al hacer clic en el botón correspondiente, validando el monto ingresado y mostrando un mensaje de éxito con el nuevo saldo de la cuenta o un mensaje de error si el retiro no se puede procesar; además, actualizamos la tarjeta de balance para reflejar el nuevo saldo después del retiro
    document.getElementById('btn-retirar').addEventListener('click', () => {
      const monto = parseFloat(document.getElementById('ret-monto').value);
      try {
        const r = cuenta.retirar(monto);
        this.#banco.save();
        let msg = `Retiro exitoso. Nuevo saldo: ${fmt(cuenta.getSaldo())}`;
        if (r && r.interes) msg = `Retiro: ${fmt(r.monto)} · Interés aplicado: +${fmt(r.interes)} · Saldo restante: ${fmt(cuenta.getSaldo())}`;
        UIHelpers.showAlert('ret-alert','success', msg);
        UIHelpers.autoHideAlert('ret-alert');
        this.#renderBalanceCard();
        if (cuenta instanceof CuentaCorriente) {
          const infoEl = document.querySelector('#retirar-content .info-box');
          if (infoEl) infoEl.querySelector('span').innerHTML =
            `Límite de retiro con sobregiro del 20%: <strong>${fmt(cuenta.getLimiteRetiro())}</strong>`;
        }
        document.getElementById('ret-monto').value = '';
      } catch(e) { UIHelpers.showAlert('ret-alert','error',e.message); }
    });
  }
// El método #renderTransferir() muestra el formulario para realizar una transferencia de dinero desde la cuenta activa hacia otra cuenta, permitiendo elegir entre transferencias a cuentas propias o a terceros, y luego procesa la transferencia al hacer clic en el botón correspondiente, mostrando mensajes de éxito o error según corresponda; además, para transferencias a terceros se incluye una funcionalidad de verificación del número de cuenta destino antes de realizar la transferencia
  // ─── TRANSFERIR ───────────────────────────────────────────
  #renderTransferir() {
    const cliente      = this.#auth.getClienteActivo();
    const cuentaOrigen = this.#auth.getCuentaActiva();
    const fmt          = UIHelpers.fmt;

    if (cuentaOrigen instanceof TarjetaCredito) {
      document.getElementById('transferir-content').innerHTML =
        `<div class="info-box warn">${Icons.alert}<span>La Tarjeta de Crédito no permite realizar transferencias. Use una <strong>Cuenta de Ahorros</strong> o <strong>Cuenta Corriente</strong>.</span></div>`;
      return;
    }

    const propias = cliente.getCuentas()
      .filter(c => c.getNumeroCuenta() !== cuentaOrigen.getNumeroCuenta() && !(c instanceof TarjetaCredito))
      .map(c => `<option value="${c.getNumeroCuenta()}">${c.getTipo()} · ${c.getNumeroCuenta()}</option>`)
      .join('');
    const origenInfo = '';
// Mostramos el formulario para realizar la transferencia, con opciones para elegir entre transferencias a cuentas propias o a terceros, y campos para ingresar el monto a transferir y el número de cuenta destino (para terceros), junto con un botón para procesar la transferencia y un contenedor para mostrar mensajes de éxito o error; además, se muestra una información adicional relevante si la cuenta origen es una Tarjeta de Crédito
    document.getElementById('transferir-content').innerHTML = `
      ${origenInfo}
      <div class="op-card">
        <h4>Nueva transferencia</h4>
        <div class="form-group"><label>Tipo de transferencia</label>
          <select id="trans-tipo" class="form-control">
            <option value="propia">Entre mis productos</option>
            <option value="tercero">A otro usuario</option>
          </select>
        </div>
        <div id="trans-destino-propio" class="form-group">
          <label>Cuenta destino</label>
          <select id="trans-cuenta-propia" class="form-control">
            ${propias || '<option disabled>No tiene otras cuentas disponibles</option>'}
          </select>
        </div>
        <div id="trans-destino-tercero" class="form-group hidden">
          <label>Número de cuenta destino</label>
          <div class="transfer-validation">
            <input id="trans-num-tercero" class="form-control" type="text" placeholder="Ej: AH1001">
            <button class="btn-verify" id="btn-verificar">Verificar</button>
          </div>
          <div id="trans-dest-info" class="hidden"></div>
        </div>
        <div class="form-group"><label>Monto a transferir (COP)</label>
          <input id="trans-monto" class="form-control" type="number" min="1" placeholder="Ej: 150.000">
        </div>
        <button class="btn-action" id="btn-transferir">Transferir</button>
        <div id="trans-alert" class="hidden" style="margin-top:12px"></div>
      </div>`;
// Variable para almacenar la cuenta destino verificada en caso de transferencias a terceros, para asegurar que se ha verificado la cuenta antes de permitir realizar la transferencia
    let destinoTerceroVerificado = null;
// Configuramos el evento para mostrar u ocultar los campos correspondientes según el tipo de transferencia seleccionado (propia o a tercero), y para procesar la transferencia al hacer clic en el botón correspondiente, validando el monto ingresado y mostrando un mensaje de éxito con los detalles de la transferencia o un mensaje de error si la transferencia no se puede procesar; además, para transferencias a terceros se incluye una funcionalidad de verificación del número de cuenta destino antes de realizar la transferencia, mostrando un mensaje con la información de la cuenta destino si es válida o un mensaje de error si no se encuentra la cuenta
    document.getElementById('trans-tipo').addEventListener('change', (e) => {
      const esPropia = e.target.value === 'propia';
      document.getElementById('trans-destino-propio').classList.toggle('hidden', !esPropia);
      document.getElementById('trans-destino-tercero').classList.toggle('hidden', esPropia);
      destinoTerceroVerificado = null;
      UIHelpers.clearAlert('trans-alert');
    });
// Configuramos el evento para verificar la cuenta destino al hacer clic en el botón de verificar, validando el número ingresado y mostrando un mensaje con la información de la cuenta destino si es válida o un mensaje de error si no se encuentra la cuenta o si se intenta transferir a la misma cuenta origen
    document.getElementById('btn-verificar').addEventListener('click', () => {
      const num    = document.getElementById('trans-num-tercero').value.trim();
      const infoEl = document.getElementById('trans-dest-info');
      if (!num) { infoEl.innerHTML = ''; infoEl.className = 'hidden'; return; }
      const cuentaDestino = this.#banco.getCuentaPorNumero(num);
      if (!cuentaDestino) {
        infoEl.innerHTML = `<div class="alert alert-error" style="margin-top:8px">${Icons.error}<span>Cuenta no encontrada en el sistema.</span></div>`;
        infoEl.className = ''; destinoTerceroVerificado = null; return;
      }
      if (cuentaDestino.getNumeroCuenta() === cuentaOrigen.getNumeroCuenta()) {
        infoEl.innerHTML = `<div class="alert alert-error" style="margin-top:8px">${Icons.error}<span>No se puede transferir al mismo producto.</span></div>`;
        infoEl.className = ''; destinoTerceroVerificado = null; return;
      }
      destinoTerceroVerificado = cuentaDestino;
      const titularDestino = this.#banco.getClientes().find(c => c.getCuentaPorNumero(cuentaDestino.getNumeroCuenta()));
      const nombreTitular  = titularDestino ? titularDestino.getNombreCompleto() : '';
      infoEl.innerHTML = `<div class="dest-confirmed">${Icons.check}<span>Cuenta verificada: <strong>${cuentaDestino.getTipo()} · ${cuentaDestino.getNumeroCuenta()}</strong>${nombreTitular ? ` · Titular: <strong>${nombreTitular}</strong>` : ''}</span></div>`;
      infoEl.className = '';
    });
// Configuramos el evento para procesar la transferencia al hacer clic en el botón correspondiente, validando el monto ingresado y mostrando un mensaje de éxito con los detalles de la transferencia o un mensaje de error si la transferencia no se puede procesar; además, para transferencias a terceros se asegura que se ha verificado la cuenta destino antes de permitir realizar la transferencia
    document.getElementById('btn-transferir').addEventListener('click', () => {
      const tipo  = document.getElementById('trans-tipo').value;
      const monto = parseFloat(document.getElementById('trans-monto').value);
      let destino = null;
// Validamos el monto ingresado para la transferencia, asegurando que sea un número válido y mayor a cero; luego, dependiendo del tipo de transferencia (propia o a tercero), obtenemos la cuenta destino seleccionada o verificada, y para transferencias a terceros se asegura que se ha verificado la cuenta destino antes de permitir realizar la transferencia
      if (tipo === 'propia') {
        const num = document.getElementById('trans-cuenta-propia').value;
        destino = cliente.getCuentaPorNumero(num);
        if (!destino) { UIHelpers.showAlert('trans-alert','error','Seleccione una cuenta destino válida.'); return; }
        if (destino.getNumeroCuenta() === cuentaOrigen.getNumeroCuenta()) { UIHelpers.showAlert('trans-alert','error','No puede transferir a la misma cuenta.'); return; }
      } else {
        if (!destinoTerceroVerificado) { UIHelpers.showAlert('trans-alert','warning','Debe verificar la cuenta destino antes de transferir.'); return; }
        destino = destinoTerceroVerificado;
      }
// Validamos el monto ingresado para la transferencia, asegurando que sea un número válido y mayor a cero; además, si la cuenta destino es una Tarjeta de Crédito, se valida que el monto a transferir no supere la deuda actual de la tarjeta, mostrando un mensaje de error si el monto es inválido o supera la deuda
      // Validar TC como destino
      if (destino instanceof TarjetaCredito) {
        if (destino.getDeudaConIntereses() === 0) {
          UIHelpers.showAlert('trans-alert','warning','La Tarjeta de Crédito no tiene deuda pendiente.');
          return;
        }
        if (!isNaN(monto) && monto > destino.getDeudaConIntereses()) {
          UIHelpers.showAlert('trans-alert','error',`El monto supera la deuda total (${fmt(destino.getDeudaConIntereses())}). Máximo a abonar: ${fmt(destino.getDeudaConIntereses())}.`);
          return;
        }
      }
// Intentamos realizar la transferencia utilizando el método transferir de la cuenta origen, pasando la cuenta destino y el monto a transferir; si la transferencia es exitosa, guardamos los cambios en el banco, mostramos un mensaje de éxito con los detalles de la transferencia (incluyendo el nuevo saldo o deuda restante si es una Tarjeta de Crédito), actualizamos la tarjeta de balance para reflejar los nuevos saldos, y limpiamos los campos del formulario; si ocurre un error durante la transferencia, mostramos un mensaje de error con la descripción del problema
      try {
        cuentaOrigen.transferir(destino, monto);
        this.#banco.save();
        const esTercero = tipo === 'tercero';
        const msg = destino instanceof TarjetaCredito
          ? `Abono de ${fmt(monto)} aplicado. Saldo origen: ${fmt(cuentaOrigen.getSaldo())} · Deuda restante TC: ${fmt(destino.getDeudaConIntereses())}.`
          : esTercero
            ? `Transferencia de ${fmt(monto)} realizada. Nuevo saldo: ${fmt(cuentaOrigen.getSaldo())}.`
            : `Transferencia exitosa. Saldo origen: ${fmt(cuentaOrigen.getSaldo())} · Saldo destino: ${fmt(destino.getSaldo())}.`;
        UIHelpers.showAlert('trans-alert','success', msg);
        UIHelpers.autoHideAlert('trans-alert');
        this.#renderBalanceCard();
        this.#renderAccountTabs();
        document.getElementById('trans-monto').value = '';
        destinoTerceroVerificado = null;
      } catch(e) { UIHelpers.showAlert('trans-alert','error',e.message); }
    });
  }
// El método #renderMovimientos() muestra la lista de movimientos registrados en la cuenta activa, formateando cada movimiento con su tipo, descripción, fecha, valor y saldo posterior; si no hay movimientos registrados, se muestra un mensaje indicando que no hay movimientos aún
  // ─── MOVIMIENTOS ──────────────────────────────────────────
  #renderMovimientos() {
    const cuenta = this.#auth.getCuentaActiva();
    const movs   = cuenta.obtenerMovimientos();
    const fmt    = UIHelpers.fmt;
    const list   = document.getElementById('movimientos-list');
// Configuramos un objeto de configuración para mapear los tipos de movimientos a clases CSS, íconos y signos correspondientes, lo que nos permite formatear cada movimiento de manera consistente según su tipo; luego, si no hay movimientos registrados, mostramos un mensaje indicando que no hay movimientos aún, y si hay movimientos, los formateamos utilizando la configuración definida para mostrar su información de manera clara y visualmente diferenciada según el tipo de movimiento
    const config = {
      CONSIGNACION:      { cls:'credit',   icon: Icons.deposit,   sign:'+' },
      RETIRO:            { cls:'debit',    icon: Icons.withdraw,  sign:'-' },
      TRANSFERENCIA_OUT: { cls:'debit',    icon: Icons.transfer,  sign:'-' },
      TRANSFERENCIA_IN:  { cls:'credit',   icon: Icons.transfer,  sign:'+' },
      COMPRA_TC:         { cls:'tc',       icon: Icons.shopping,  sign:'-' },
      PAGO_TC:           { cls:'credit',   icon: Icons.payment,   sign:'+' },
    };
// Si no hay movimientos registrados, mostramos un mensaje indicando que no hay movimientos aún; de lo contrario, formateamos cada movimiento utilizando la configuración definida para mostrar su información de manera clara y visualmente diferenciada según el tipo de movimiento, incluyendo el ícono, la descripción, la fecha, el valor con el signo correspondiente, y el saldo posterior al movimiento
    if (!movs.length) {
      list.innerHTML = `<div class="info-box warn">${Icons.history}<span>No hay movimientos registrados en esta cuenta.</span></div>`;
      return;
    }
// Formateamos cada movimiento utilizando la configuración definida para mostrar su información de manera clara y visualmente diferenciada según el tipo de movimiento, incluyendo el ícono, la descripción, la fecha, el valor con el signo correspondiente, y el saldo posterior al movimiento; luego unimos todos los elementos formateados en una sola cadena HTML para mostrar la lista completa de movimientos
    list.innerHTML = movs.map(m => {
      const o  = m.toObject();
      const cf = config[o.tipo] || { cls:'credit', icon: Icons.wallet, sign:'+' };
      return `
        <div class="mv-item">
          <div class="mv-icon ${cf.cls}">${cf.icon}</div>
          <div class="mv-details">
            <div class="mv-desc">${o.descripcion}</div>
            <div class="mv-date">${o.fechaHora}</div>
          </div>
          <div class="mv-amount">
            <div class="mv-val ${cf.cls}">${cf.sign}${fmt(o.valor)}</div>
            <div class="mv-saldo">${cuenta instanceof TarjetaCredito ? `Cupo disp: ${fmt(cuenta.getCupoDisponible())}` : `Saldo: ${fmt(o.saldoPosterior)}`}</div>
          </div>
        </div>`;
    }).join('');
  }
// El método #renderPerfil() muestra el formulario para editar los datos personales del cliente activo y cambiar su contraseña, permitiendo ingresar la nueva información y procesar los cambios al hacer clic en los botones correspondientes, mostrando mensajes de éxito o error según corresponda; además, se actualiza la barra lateral para reflejar los cambios en el perfil del cliente
  // ─── PERFIL ───────────────────────────────────────────────
  #renderPerfil() {
    const cliente = this.#auth.getClienteActivo();
    document.getElementById('perfil-content').innerHTML = `
      <div class="profile-grid">
        <div class="op-card">
          <h4>Datos personales</h4>
          <div class="form-group"><label>Identificación</label><input id="p-id" class="form-control" value="${cliente.getIdentificacion()}"></div>
          <div class="form-group"><label>Nombre completo</label><input id="p-nombre" class="form-control" value="${cliente.getNombreCompleto()}"></div>
          <div class="form-group"><label>Celular</label><input id="p-celular" class="form-control" value="${cliente.getCelular()}"></div>
          <div class="form-group"><label>Usuario</label><input class="form-control" value="${cliente.getUsuario()}" disabled style="opacity:.4"></div>
          <button class="btn-action" id="btn-guardar-perfil">Guardar cambios</button>
          <div id="perfil-alert" class="hidden" style="margin-top:12px"></div>
        </div>
        <div class="op-card">
          <h4>Cambiar contraseña</h4>
          <div class="form-group"><label>Contraseña actual</label><input id="pass-actual" class="form-control" type="password" placeholder="Contraseña actual"></div>
          <div class="form-group"><label>Nueva contraseña</label><input id="pass-nueva" class="form-control" type="password" placeholder="Mínimo 4 caracteres"></div>
          <div class="form-group"><label>Confirmar nueva contraseña</label><input id="pass-conf" class="form-control" type="password" placeholder="Repita la nueva contraseña"></div>
          <button class="btn-action" id="btn-cambiar-pass">Cambiar contraseña</button>
          <div id="pass-alert" class="hidden" style="margin-top:12px"></div>
        </div>
      </div>`;
// Configuramos el evento para procesar la actualización del perfil al hacer clic en el botón correspondiente, validando los datos ingresados y mostrando un mensaje de éxito si el perfil se actualiza correctamente o un mensaje de error si ocurre algún problema; además, después de actualizar el perfil, se actualiza la barra lateral para reflejar los cambios en la información del cliente
    document.getElementById('btn-guardar-perfil').addEventListener('click', () => {
      try {
        cliente.editarPerfil({
          identificacion: document.getElementById('p-id').value,
          nombreCompleto: document.getElementById('p-nombre').value,
          celular:        document.getElementById('p-celular').value
        });
        this.#banco.save();
        UIHelpers.showAlert('perfil-alert','success','Perfil actualizado correctamente.');
        UIHelpers.autoHideAlert('perfil-alert');
        this.#renderSidebar();
      } catch(e) { UIHelpers.showAlert('perfil-alert','error',e.message); }
    });
// Configuramos el evento para procesar el cambio de contraseña al hacer clic en el botón correspondiente, validando las contraseñas ingresadas y mostrando un mensaje de éxito si la contraseña se actualiza correctamente o un mensaje de error si ocurre algún problema; además, después de cambiar la contraseña, se limpian los campos del formulario para mayor seguridad
    document.getElementById('btn-cambiar-pass').addEventListener('click', () => {
      const actual = document.getElementById('pass-actual').value;
      const nueva  = document.getElementById('pass-nueva').value;
      const conf   = document.getElementById('pass-conf').value;
      if (nueva !== conf) { UIHelpers.showAlert('pass-alert','error','Las contraseñas nuevas no coinciden.'); return; }
      try {
        cliente.cambiarContrasena(actual, nueva);
        this.#banco.save();
        UIHelpers.showAlert('pass-alert','success','Contraseña actualizada correctamente.');
        UIHelpers.autoHideAlert('pass-alert');
        document.getElementById('pass-actual').value = '';
        document.getElementById('pass-nueva').value  = '';
        document.getElementById('pass-conf').value   = '';
      } catch(e) { UIHelpers.showAlert('pass-alert','error',e.message); }
    });
  }
}
