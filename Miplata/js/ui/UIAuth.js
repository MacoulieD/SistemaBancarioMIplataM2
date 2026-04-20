// UIAuth.js - Maneja la interfaz de autenticación (login y registro)
class UILogin {
  #auth; #banco; #onSuccess;
  constructor(auth, banco, onSuccess) {
    this.#auth = auth; this.#banco = banco; this.#onSuccess = onSuccess;
    document.getElementById('form-login')
      ?.addEventListener('submit', e => { e.preventDefault(); this.#handle(); });
  }
// Maneja el evento de submit del formulario de login, intentando autenticar al usuario y mostrando mensajes de error o éxito
  #handle() {
    const usuario   = document.getElementById('login-usuario').value.trim();
    const contrasena= document.getElementById('login-contrasena').value;
    UIHelpers.clearAlert('login-alert');
    if (!usuario || !contrasena) {
      UIHelpers.showAlert('login-alert','error','Ingrese usuario y contraseña.'); return;
    }
    // Intentamos autenticar al usuario; si hay un error (credenciales incorrectas, cuenta bloqueada, etc.) se muestra el mensaje correspondiente
    try {
      const cliente = this.#auth.login(usuario, contrasena);
      UIHelpers.showAlert('login-alert','success',`Bienvenido, ${cliente.getNombreCompleto()}.`);
      document.getElementById('login-intentos').classList.add('hidden');
      setTimeout(() => this.#onSuccess(cliente), 700);
    } catch(e) {
      UIHelpers.showAlert('login-alert','error', e.message);
      const c = this.#banco.getClientePorUsuario(usuario);
      const intentosEl = document.getElementById('login-intentos');
      if (c && !c.isBloqueado()) {
        intentosEl.innerHTML = `${Icons.lock} Intentos restantes: ${3 - c.getIntentosFallidos()}`;
        intentosEl.classList.remove('hidden');
      } else if (c && c.isBloqueado()) {
        intentosEl.innerHTML = `${Icons.lock} Cuenta bloqueada. Contacte al banco.`;
        intentosEl.classList.remove('hidden');
        document.getElementById('btn-login').disabled = true;
      }
    }
  }
// Resetea el formulario de login y oculta mensajes de error o intentos restantes
  reset() {
    document.getElementById('form-login')?.reset();
    UIHelpers.clearAlert('login-alert');
    document.getElementById('login-intentos').classList.add('hidden');
    const btn = document.getElementById('btn-login');
    if (btn) btn.disabled = false;
  }
}
// UIRegistro.js - Maneja la interfaz de registro de nuevos clientes
class UIRegistro {
  #banco; #onSuccess; #_lastPass = '';
  constructor(banco, onSuccess) {
    this.#banco = banco; this.#onSuccess = onSuccess;
    document.getElementById('form-registro')
      ?.addEventListener('submit', e => { e.preventDefault(); this.#handle(); });
  }
// Maneja el evento de submit del formulario de registro, validando los datos ingresados y creando un nuevo cliente si todo es correcto, o mostrando mensajes de error si hay problemas con los datos
  #handle() {
    const identificacion= document.getElementById('reg-id').value.trim();
    const nombreCompleto= document.getElementById('reg-nombre').value.trim();
    const celular       = document.getElementById('reg-celular').value.trim();
    const usuario       = document.getElementById('reg-usuario').value.trim();
    const contrasena    = document.getElementById('reg-contrasena').value;
    const confirmar     = document.getElementById('reg-confirmar').value;
    const tipoCuenta    = document.getElementById('reg-tipo').value;
    const saldoInicial  = parseFloat(document.getElementById('reg-saldo').value) || 0;
// Validaciones básicas de los campos del formulario; si alguna falla, se muestra un mensaje de error específico y se detiene el proceso de registro
    UIHelpers.clearAlert('reg-alert');
// Validamos que todos los campos estén completos
    if (!identificacion || !nombreCompleto || !celular || !usuario || !contrasena || !confirmar) {
      UIHelpers.showAlert('reg-alert','error','Todos los campos son obligatorios.'); return;
    }
    if (contrasena !== confirmar) {
      UIHelpers.showAlert('reg-alert','error','Las contraseñas no coinciden.'); return;
    }
    if (contrasena.length < 4) {
      UIHelpers.showAlert('reg-alert','warning','La contraseña debe tener mínimo 4 caracteres.'); return;
    }
    if (!/^\d+$/.test(celular)) {
      UIHelpers.showAlert('reg-alert','warning','El celular solo debe contener dígitos.'); return;
    }
    if (saldoInicial < 0) {
      UIHelpers.showAlert('reg-alert','warning','El saldo inicial no puede ser negativo.'); return;
    }
// Si todas las validaciones pasan, intentamos registrar al cliente en el banco; si hay un error (usuario ya existe, identificación duplicada, etc.) se muestra el mensaje correspondiente
    try {
      this.#_lastPass = contrasena;
      const cliente = this.#banco.registrarCliente(
        identificacion, nombreCompleto, celular, usuario, contrasena, tipoCuenta, saldoInicial
      );
      UIHelpers.showAlert('reg-alert','success',`Cuenta creada exitosamente. Por favor inicie sesión.`);
      setTimeout(() => this.#onSuccess(cliente), 1200);
    } catch(e) { UIHelpers.showAlert('reg-alert','error', e.message); }
  }
// Resetea el formulario de registro y oculta mensajes de error
  reset() {
    document.getElementById('form-registro')?.reset();
    UIHelpers.clearAlert('reg-alert');
    this.#_lastPass = '';
  }
}
