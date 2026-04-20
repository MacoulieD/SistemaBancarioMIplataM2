/**
 * ENCAPSULAMIENTO + ABSTRACCIÓN
 * Cliente implementa IAutenticable.
 * Todos los atributos sensibles son privados con #.
 */
class Cliente {
  #id;
  #identificacion;
  #nombreCompleto;
  #celular;
  #usuario;
  #contrasena;
  #intentosFallidos;
  #bloqueado;
  #cuentas;
// Contador estático para generar IDs únicos
  static #contadorId = 1;
// El constructor puede recibir un objeto para restaurar desde almacenamiento
  constructor(identificacion, nombreCompleto, celular, usuario, contrasena) {
    if (identificacion && typeof identificacion === 'object' && identificacion.__restore) {
      const r = identificacion;
      this.#id               = r.id;
      this.#identificacion   = r.identificacion;
      this.#nombreCompleto   = r.nombreCompleto;
      this.#celular          = r.celular;
      this.#usuario          = r.usuario;
      this.#contrasena       = r.contrasena;
      this.#intentosFallidos = r.intentosFallidos || 0;
      this.#bloqueado        = r.bloqueado || false;
      this.#cuentas          = (r.cuentas || []).map(c => {
        if (c.codigo === 'AH') return CuentaAhorros.fromObject(c);
        if (c.codigo === 'CC') return CuentaCorriente.fromObject(c);
        if (c.codigo === 'TC') return TarjetaCredito.fromObject(c);
        return null;
      }).filter(Boolean);
      if (r.id >= Cliente.#contadorId) Cliente.#contadorId = r.id + 1;
      return;
    }
    this.#id               = Cliente.#contadorId++;
    this.#identificacion   = identificacion.trim();
    this.#nombreCompleto   = nombreCompleto.trim();
    this.#celular          = celular.trim();
    this.#usuario          = usuario.trim();
    this.#contrasena       = contrasena;
    this.#intentosFallidos = 0;
    this.#bloqueado        = false;
    this.#cuentas          = [];
  }
// Getters para atributos privados
  getId()               { return this.#id; }
  getIdentificacion()   { return this.#identificacion; }
  getNombreCompleto()   { return this.#nombreCompleto; }
  getCelular()          { return this.#celular; }
  getUsuario()          { return this.#usuario; }
  getIntentosFallidos() { return this.#intentosFallidos; }
  isBloqueado()         { return this.#bloqueado; }
  getCuentas()          { return [...this.#cuentas]; }

  // Setters con validación
  setNombreCompleto(v) {
    if (!v || v.trim() === '') throw new Error('El nombre no puede estar vacío.');
    this.#nombreCompleto = v.trim();
  }
  // El celular debe ser solo dígitos y no vacío
  setCelular(v) {
    if (!v || v.trim() === '') throw new Error('El celular no puede estar vacío.');
    if (!/^\d+$/.test(v.trim())) throw new Error('El celular solo debe contener dígitos.');
    this.#celular = v.trim();
  }
  // La identificación no puede estar vacía
  setIdentificacion(v) {
    if (!v || v.trim() === '') throw new Error('La identificación no puede estar vacía.');
    this.#identificacion = v.trim();
  }

  // IAutenticable
  autenticar(usuario, contrasena) {
    if (this.#bloqueado)
      throw new Error('Cuenta bloqueada por múltiples intentos fallidos. Contacte al banco.');
    if (this.#usuario === usuario && this.#contrasena === contrasena) {
      this.resetearIntentos();
      return true;
    }
    this.incrementarIntentos();
    return false;
  }
// cerrar sesión no hace nada especial
  cerrarSesion() { return true; }
// Para cambiar la contraseña, se debe validar la actual y la nueva
  cambiarContrasena(oldPass, newPass) {
    if (this.#contrasena !== oldPass)
      throw new Error('La contraseña actual es incorrecta.');
    if (!newPass || newPass.trim().length < 4)
      throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
    this.#contrasena = newPass;
    return true;
  }
// Incrementa los intentos fallidos y bloquea la cuenta si se superan los 3 intentos
  incrementarIntentos() {
    this.#intentosFallidos++;
    if (this.#intentosFallidos >= 3) {
      this.#bloqueado = true;
      throw new Error('Cuenta bloqueada. Ha superado el límite de 3 intentos fallidos.');
    }
  }
// Resetea los intentos fallidos (se llama al autenticar con éxito)
  resetearIntentos() {
    this.#intentosFallidos = 0;
  }
// IEditable
  editarPerfil(datos) {
    if (datos.nombreCompleto) this.setNombreCompleto(datos.nombreCompleto);
    if (datos.celular)         this.setCelular(datos.celular);
    if (datos.identificacion)  this.setIdentificacion(datos.identificacion);
    return true;
  }
// Métodos relacionados con cuentas
  tieneTarjetaCredito() {
    return this.#cuentas.some(c => c instanceof TarjetaCredito);
  }
// Agrega una cuenta al cliente
  agregarCuenta(cuenta)    { this.#cuentas.push(cuenta); }
// Busca una cuenta por su número y la devuelve, o null si no se encuentra
  getCuentaPorNumero(num)  {
    return this.#cuentas.find(c => c.getNumeroCuenta() === num) || null;
  }
// Elimina una cuenta por su número
  eliminarCuenta(num) {
    const idx = this.#cuentas.findIndex(c => c.getNumeroCuenta() === num);
    if (idx === -1) throw new Error('Cuenta no encontrada.');
    this.#cuentas.splice(idx, 1);
  }
// Convierte el cliente a un objeto plano para almacenamiento o transferencia
  toObject() {
    return {
      id:               this.#id,
      identificacion:   this.#identificacion,
      nombreCompleto:   this.#nombreCompleto,
      celular:          this.#celular,
      usuario:          this.#usuario,
      intentosFallidos: this.#intentosFallidos,
      bloqueado:        this.#bloqueado,
      cuentas:          this.#cuentas.map(c => c.toObject())
    };
  }
// Convierte el cliente a un objeto plano para almacenamiento, incluyendo la contraseña (usado internamente)
  toStorageObject() {
    return {
      id:               this.#id,
      identificacion:   this.#identificacion,
      nombreCompleto:   this.#nombreCompleto,
      celular:          this.#celular,
      usuario:          this.#usuario,
      contrasena:       this.#contrasena,
      intentosFallidos: this.#intentosFallidos,
      bloqueado:        this.#bloqueado,
      cuentas:          this.#cuentas.map(c => c.toStorageObject())
    };
  }
// Método estático para crear un cliente a partir de un objeto (usado para restaurar desde almacenamiento)
  static fromObject(obj) { return new Cliente({ __restore: true, ...obj }); }
}
