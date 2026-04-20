const MIPLATA_STORAGE_KEY = 'miplata_v1';

/**
 * BancoService — gestión central de clientes y cuentas.
 */
class BancoService {
  #clientes;
  #contadorCuenta;
// El constructor inicializa el servicio y carga los datos almacenados (si existen)
  constructor() {
    this.#clientes      = [];
    this.#contadorCuenta= 1000;
  }
// Guarda el estado actual del banco (clientes, cuentas, movimientos) en localStorage
  save() {
    try {
      localStorage.setItem(MIPLATA_STORAGE_KEY, JSON.stringify({
        contadorCuenta: this.#contadorCuenta,
        clientes: this.#clientes.map(c => c.toStorageObject())
      }));
    } catch(e) { console.error('Error al guardar datos:', e); }
  }
// Carga el estado del banco desde localStorage, restaurando clientes, cuentas y movimientos
  load() {
    try {
      const raw = localStorage.getItem(MIPLATA_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.#contadorCuenta = data.contadorCuenta || 1000;
      this.#clientes = (data.clientes || []).map(c => Cliente.fromObject(c));
      return true;
    } catch(e) {
      console.error('Error al cargar datos:', e);
      return false;
    }
  }
// Método privado para generar un número de cuenta único con prefijo (ej. 'AH' para Ahorros, 'CC' para Corriente)
  #generarNumero(prefijo) {
    return `${prefijo}${++this.#contadorCuenta}`;
  }
// Registra un nuevo cliente con una cuenta inicial (Ahorros o Corriente) y lo agrega al banco
  registrarCliente(identificacion, nombreCompleto, celular, usuario, contrasena, tipoCuenta, saldoInicial = 0) {
    if (!identificacion || !nombreCompleto || !celular || !usuario || !contrasena)
      throw new Error('Todos los campos son obligatorios.');
    if (this.#clientes.find(c => c.getUsuario() === usuario))
      throw new Error('El nombre de usuario ya existe en el sistema.');
    if (this.#clientes.find(c => c.getIdentificacion() === identificacion))
      throw new Error('Ya existe un cliente con esa identificación.');
    if (!['AH','CC'].includes(tipoCuenta))
      throw new Error('El tipo de cuenta inicial debe ser Ahorros o Corriente.');
    if (typeof saldoInicial !== 'number' || isNaN(saldoInicial) || saldoInicial < 0)
      throw new Error('El saldo inicial debe ser un número mayor o igual a cero.');
// Creamos el cliente y la cuenta inicial, luego los registramos en el banco
    const cliente = new Cliente(identificacion, nombreCompleto, celular, usuario, contrasena);
    const cuenta  = tipoCuenta === 'AH'
      ? new CuentaAhorros(this.#generarNumero('AH'), saldoInicial)
      : new CuentaCorriente(this.#generarNumero('CC'), saldoInicial);
// Agregamos la cuenta al cliente y registramos al cliente en el banco
    cliente.agregarCuenta(cuenta);
    this.#clientes.push(cliente);
    this.save();
    return cliente;
  }
// Permite a un cliente existente abrir una nueva cuenta (Ahorros o Corriente) si no tiene una del mismo tipo
  abrirCuenta(clienteId, tipoCuenta) {
    const cliente = this.getClientePorId(clienteId);
    const cuentas = cliente.getCuentas();
    const tieneAH = cuentas.some(c => c instanceof CuentaAhorros);
    const tieneCC = cuentas.some(c => c instanceof CuentaCorriente);
    if (tipoCuenta === 'AH' && tieneAH)
      throw new Error('Ya tiene una Cuenta de Ahorros activa.');
    if (tipoCuenta === 'CC' && tieneCC)
      throw new Error('Ya tiene una Cuenta Corriente activa.');
    if (!['AH','CC'].includes(tipoCuenta))
      throw new Error('Tipo de cuenta inválido.');
    const cuenta = tipoCuenta === 'AH'
      ? new CuentaAhorros(this.#generarNumero('AH'), 0)
      : new CuentaCorriente(this.#generarNumero('CC'), 0);
    cliente.agregarCuenta(cuenta);
    this.save();
    return cuenta;
  }
// Permite a un cliente solicitar una tarjeta de crédito si no tiene una activa
  solicitarTarjetaCredito(clienteId) {
    const cliente = this.getClientePorId(clienteId);
    if (cliente.tieneTarjetaCredito())
      throw new Error('Ya cuenta con una Tarjeta de Crédito activa.');
    const tc = new TarjetaCredito(this.#generarNumero('TC'));
    cliente.agregarCuenta(tc);
    this.save();
    return tc;
  }
// Devuelve una lista de todos los clientes registrados en el banco
  getClientes()   { return [...this.#clientes]; }
// Busca un cliente por su ID y lo devuelve, o lanza un error si no se encuentra
  getClientePorId(id) {
    const c = this.#clientes.find(c => c.getId() === id);
    if (!c) throw new Error('Cliente no encontrado.');
    return c;
  }
// Busca un cliente por su nombre de usuario y lo devuelve, o null si no se encuentra (usado para autenticación)
  getClientePorUsuario(usuario) {
    return this.#clientes.find(c => c.getUsuario() === usuario) || null;
  }
// Elimina un cliente por su ID, removiéndolo del banco
  eliminarCliente(id) {
    const idx = this.#clientes.findIndex(c => c.getId() === id);
    if (idx === -1) throw new Error('Cliente no encontrado.');
    this.#clientes.splice(idx, 1);
  }
// Busca una cuenta por su número entre todos los clientes y la devuelve, o null si no se encuentra (usado para transferencias entre cuentas)
  getCuentaPorNumero(num) {
    for (const c of this.#clientes) {
      const cuenta = c.getCuentaPorNumero(num);
      if (cuenta) return cuenta;
    }
    return null;
  }
}

/**
 * AuthService — gestiona la sesión activa del cliente.
 */
class AuthService {
  #clienteActivo;
  #cuentaActiva;
  #banco;
// El constructor recibe una instancia de BancoService para acceder a los clientes y cuentas
  constructor(banco) {
    this.#banco         = banco;
    this.#clienteActivo = null;
    this.#cuentaActiva  = null;
  }
// Permite a un cliente iniciar sesión con su nombre de usuario y contraseña, estableciendo la sesión activa
  login(usuario, contrasena) {
    const cliente = this.#banco.getClientePorUsuario(usuario);
    if (!cliente) throw new Error('Usuario no encontrado en el sistema.');
// Intentamos autenticar al cliente; si falla, se incrementan los intentos fallidos y se bloquea la cuenta si supera el límite
    const ok = cliente.autenticar(usuario, contrasena);
    if (ok) {
      this.#clienteActivo = cliente;
      this.#cuentaActiva  = cliente.getCuentas()[0] || null;
      return cliente;
    }
    const restantes = 3 - cliente.getIntentosFallidos();
    throw new Error(`Credenciales incorrectas. Intentos restantes: ${restantes}`);
  }
// Cierra la sesión activa, limpiando el cliente y cuenta activos
  logout() {
    this.#clienteActivo = null;
    this.#cuentaActiva  = null;
  }
// Devuelve el cliente activo en la sesión, o null si no hay sesión iniciada
  getClienteActivo()      { return this.#clienteActivo; }
  getCuentaActiva()       { return this.#cuentaActiva; }
  setCuentaActiva(cuenta) { this.#cuentaActiva = cuenta; }
  estaAutenticado()       { return this.#clienteActivo !== null; }
}
