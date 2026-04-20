/**
 * ABSTRACCIÓN + ENCAPSULAMIENTO
 * Clase abstracta Cuenta — base de todos los productos bancarios.
 * 
 */
//
class Cuenta {
  #numeroCuenta;
  #saldo;
  #fechaApertura;
  #estado;
  #movimientos;
// Estados posibles de una cuenta
  constructor(numeroCuenta, saldoInicial = 0) {
    if (new.target === Cuenta)
      throw new Error('Cuenta es abstracta y no puede instanciarse directamente.');
    if (numeroCuenta && typeof numeroCuenta === 'object' && numeroCuenta.__restore) {
      const r = numeroCuenta;
      this.#numeroCuenta  = r.numeroCuenta;
      this.#saldo         = r.saldo;
      this.#fechaApertura = new Date(r.fechaAperturaRaw || Date.now());
      this.#estado        = r.estado;
      this.#movimientos   = (r.movimientos || []).map(m => Movimiento.fromObject(m));
      return;
    }
    this.#numeroCuenta  = numeroCuenta;
    this.#saldo         = saldoInicial;
    this.#fechaApertura = new Date();
    this.#estado        = EstadoCuenta.ACTIVA;
    this.#movimientos   = [];
  }
// Getters para atributos privados
  getNumeroCuenta() { return this.#numeroCuenta; }
  getSaldo()        { return this.#saldo; }
  getFechaApertura(){ return this.#fechaApertura; }
  getEstado()       { return this.#estado; }
// Setters protegidos para modificar saldo y estado (solo para uso interno o subclases)
  _setSaldo(v)  { this.#saldo  = v; }
  _setEstado(v) { this.#estado = v; }
// Métodos comunes a todas las cuentas
  consultarSaldo() { return this.#saldo; }
// POLIMORFISMO: consignar() es común pero cada tipo de cuenta puede tener reglas distintas (ej. bloqueos, límites)
  consignar(monto) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto a consignar debe ser un número mayor a cero.');
    if (this.#estado !== EstadoCuenta.ACTIVA)
      throw new Error('La cuenta no está activa.');
    this.#saldo += monto;
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.CONSIGNACION, monto, this.#saldo,
      `Consignación de ${this._fmt(monto)}`
    ));
  }

  // POLIMORFISMO: retirar() es abstracto — cada subclase lo implementa distinto
  retirar(monto) {
    throw new Error('retirar() debe ser implementado por la subclase.');
  }
// Devuelve los movimientos ordenados del más reciente al más antiguo
  obtenerMovimientos() {
    return [...this.#movimientos].sort((a, b) => b.getFechaHora() - a.getFechaHora());
  }
// Registra un movimiento en la cuenta (usado internamente por consignar, retirar, transferencias, etc.)
  registrarMovimiento(mov) { this.#movimientos.push(mov); }
// Método para recibir una transferencia (usado por transferir() de otras cuentas)
  _recibirTransferencia(monto, origen) {
    this._setSaldo(this.getSaldo() + monto);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.TRANSFERENCIA_IN, monto, this.getSaldo(),
      `Transferencia recibida desde cuenta ${origen}`
    ));
  }
// Método para enviar una transferencia (usado por transferir() de esta cuenta)
  _fmt(v) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(v);
  }
// Métodos abstractos que deben ser implementados por las subclases
  getTipo()   { throw new Error('getTipo() debe ser implementado.'); }
  getCodigo() { throw new Error('getCodigo() debe ser implementado.'); }
// Convierte la cuenta a un objeto plano para almacenamiento o transferencia
  toObject() {
    return {
      numeroCuenta:  this.#numeroCuenta,
      tipo:          this.getTipo(),
      saldo:         this.#saldo,
      estado:        this.#estado,
      fechaApertura: this.#fechaApertura.toLocaleDateString('es-CO')
    };
  }
// Convierte la cuenta a un objeto plano para almacenamiento, incluyendo movimientos (usado internamente)
  toStorageObject() {
    return {
      codigo:          this.getCodigo(),
      numeroCuenta:    this.#numeroCuenta,
      saldo:           this.#saldo,
      estado:          this.#estado,
      fechaAperturaRaw: this.#fechaApertura.toISOString(),
      movimientos:     this.#movimientos.map(m => m.toObject())
    };
  }
}
