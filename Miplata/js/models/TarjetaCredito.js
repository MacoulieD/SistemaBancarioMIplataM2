/**
 * HERENCIA + POLIMORFISMO
 * TarjetaCredito extiende Cuenta.
 * Cupo fijo: $4.000.000. Se obtiene por solicitud en el dashboard.
 * retirar() = comprar() a las cuotas elegidas por el usuario.
 * Motor financiero con tabla de tasas variables.
 */
class TarjetaCredito extends Cuenta {
  #cupo;
  #deuda;
// El constructor puede recibir un objeto para restaurar desde almacenamiento
  static CUPO_MAXIMO = 4000000;
// El constructor puede recibir un objeto para restaurar desde almacenamiento o parámetros para crear una nueva tarjeta
  constructor(numeroCuenta) {
    super(numeroCuenta, 0);
    if (numeroCuenta && typeof numeroCuenta === 'object' && numeroCuenta.__restore) {
      this.#cupo  = TarjetaCredito.CUPO_MAXIMO;
      this.#deuda = numeroCuenta.deuda || 0;
      return;
    }
    this.#cupo  = TarjetaCredito.CUPO_MAXIMO;
    this.#deuda = 0;
  }
// Getters para atributos privados
  getTipo()   { return 'Tarjeta de Crédito'; }
  getCodigo() { return 'TC'; }
  getCupo()           { return this.#cupo; }
  getDeuda()          { return this.#deuda; }
  getCupoDisponible() { return this.#cupo - this.#deuda; }

  /**
   * Tabla de tasas mensuales:
   * <= 2 cuotas → 0%
   * 3 – 6 cuotas → 1.9% mensual
   * >= 7 cuotas → 2.3% mensual
   */
  calcularTasa(cuotas) {
    if (cuotas <= 2) return 0;
    if (cuotas <= 6) return 0.019;
    return 0.023;
  }

  /**
   * Fórmula cuota amortizada:
   * Cuota = (Capital × tasa) / (1 − (1 + tasa)^−n)
   * Si tasa = 0: Cuota = Capital / n
   */
  calcularCuotaMensual(capital, cuotas) {
    const tasa = this.calcularTasa(cuotas);
    if (tasa === 0) return capital / cuotas;
    return (capital * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
  }
// POLIMORFISMO: comprar() registra la compra con las cuotas elegidas y calcula la deuda total incluyendo intereses
  comprar(monto, cuotas) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto de compra debe ser mayor a cero.');
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 36)
      throw new Error('El número de cuotas debe ser entre 1 y 36.');
    if (this.getEstado() !== EstadoCuenta.ACTIVA)
      throw new Error('La tarjeta no está activa.');
    if (monto > this.getCupoDisponible())
      throw new Error(`Cupo insuficiente. Disponible: ${this._fmt(this.getCupoDisponible())}`);
// Si la validación es exitosa, registramos la compra y actualizamos la deuda total
    this.#deuda += monto;
    const tasa        = this.calcularTasa(cuotas);
    const cuotaMensual= this.calcularCuotaMensual(monto, cuotas);
// Registramos el movimiento de compra con detalles de cuotas e intereses
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.COMPRA_TC, monto, this.getSaldo(),
      `Compra ${this._fmt(monto)} a ${cuotas} cuota(s) · Cuota mensual: ${this._fmt(cuotaMensual)} · Tasa: ${(tasa * 100).toFixed(1)}%`
    ));
    return { monto, cuotas, tasa, cuotaMensual, deudaTotal: this.#deuda, cupoDisponible: this.getCupoDisponible() };
  }
// POLIMORFISMO: pagar() permite abonar a la deuda de la tarjeta, reduciendo el monto adeudado
  pagar(monto) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El pago debe ser mayor a cero.');
    if (this.#deuda === 0)
      throw new Error('No tiene deuda pendiente.');
    if (monto > this.#deuda)
      throw new Error(`El pago (${this._fmt(monto)}) supera la deuda actual (${this._fmt(this.#deuda)}).`);
// Si la validación es exitosa, registramos el pago y actualizamos la deuda restante
    this.#deuda -= monto;
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.PAGO_TC, monto, this.getSaldo(),
      `Pago tarjeta ${this._fmt(monto)}. Deuda restante: ${this._fmt(this.#deuda)}`
    ));
    return { montoPagado: monto, deudaRestante: this.#deuda };
  }

  /** POLIMORFISMO: retirar en TC = comprar a las cuotas que elija el usuario */
  retirar(monto, cuotas = 1) {
    return this.comprar(monto, cuotas);
  }

  // ITransferible
  validarDestino(destino) {
    if (!destino) throw new Error('Cuenta destino no válida.');
    if (destino.getNumeroCuenta() === this.getNumeroCuenta())
      throw new Error('No se permite transferir al mismo producto.');
    return true;
  }
// ITransferible
  transferir(destino, monto) {
    this.validarDestino(destino);
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto a transferir debe ser mayor a cero.');
    if (monto > this.getCupoDisponible())
      throw new Error(`Cupo insuficiente. Disponible: ${this._fmt(this.getCupoDisponible())}`);
// Si la validación es exitosa, realizamos la transferencia registrando un avance en efectivo (similar a una compra) y actualizando la deuda
    this.#deuda += monto;
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.TRANSFERENCIA_OUT, monto, this.getSaldo(),
      `Avance en efectivo a cuenta ${destino.getNumeroCuenta()}`
    ));
    destino._recibirTransferencia(monto, this.getNumeroCuenta());
  }
// Método para recibir una transferencia (usado por transferir() de otras cuentas)
  _recibirTransferencia(monto, origen) {
    this.#deuda = Math.max(0, this.#deuda - monto);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.TRANSFERENCIA_IN, monto, this.getSaldo(),
      `Abono recibido desde cuenta ${origen}. Deuda restante: ${this._fmt(this.#deuda)}`
    ));
  }
// Convierte la cuenta a un objeto plano para almacenamiento o transferencia
  toObject() {
    return { ...super.toObject(), cupo: this.#cupo, deuda: this.#deuda, cupoDisponible: this.getCupoDisponible() };
  }
// Convierte la cuenta a un objeto plano para almacenamiento, incluyendo movimientos (usado internamente)
  toStorageObject() { return { ...super.toStorageObject(), deuda: this.#deuda }; }
  static fromObject(obj) { return new TarjetaCredito({ __restore: true, ...obj }); }
}
