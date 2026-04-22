/**
 * HERENCIA + POLIMORFISMO
 * CuentaAhorros extiende Cuenta.
 * retirar() aplica interés del 1.5% mensual sobre el monto retirado.
 */
class CuentaAhorros extends Cuenta {
  #tasaInteres;
// El constructor puede recibir un objeto para restaurar desde almacenamiento
  constructor(numeroCuenta, saldoInicial = 0) {
    super(numeroCuenta, saldoInicial);
    this.#tasaInteres = 0.015;
  }
// Getters para atributos privados
  getTipo()   { return 'Cuenta de Ahorros'; }
  getCodigo() { return 'AH'; }
  getTasaInteres() { return this.#tasaInteres; }
// Método para calcular el interés sobre un monto dado
  calcularIntereses(monto) { return monto * this.#tasaInteres; }

  /**
   * POLIMORFISMO: retirar en Ahorros acredita rendimiento del 1.5% sobre el saldo
   * antes de procesar el retiro. El interés es un beneficio, no un costo.
   */
  retirar(monto) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto a retirar debe ser mayor a cero.');
    if (this.getEstado() !== EstadoCuenta.ACTIVA)
      throw new Error('La cuenta no está activa.');

    if (monto > this.getSaldo())
      throw new Error(`Saldo insuficiente. Disponible: ${this._fmt(this.getSaldo())}`);

    // Rendimiento del 1.5% calculado sobre el monto retirado y acreditado en cuenta
    const interes    = this.calcularIntereses(monto);
    const saldoFinal = this.getSaldo() - monto + interes;

    this._setSaldo(saldoFinal);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.RETIRO, monto, this.getSaldo(),
      `Retiro ${this._fmt(monto)} · Rendimiento acreditado: +${this._fmt(interes)}`
    ));
    return { monto, interes, saldoFinal, saldoActual: this.getSaldo() };
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
    if (monto > this.getSaldo())
      throw new Error(`Saldo insuficiente. Disponible: ${this._fmt(this.getSaldo())}`);
// Si la validación es exitosa, realizamos la transferencia
    this._setSaldo(this.getSaldo() - monto);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.TRANSFERENCIA_OUT, monto, this.getSaldo(),
      `Transferencia a cuenta ${destino.getNumeroCuenta()}`
    ));
    destino._recibirTransferencia(monto, this.getNumeroCuenta());
  }
// Convierte la cuenta a un objeto plano para almacenamiento o transferencia
  toObject() {
    return { ...super.toObject(), tasaInteres: '1.5% mensual' };
  }
// Convierte la cuenta a un objeto plano para almacenamiento, incluyendo movimientos (usado internamente)
  toStorageObject() { return super.toStorageObject(); }
  static fromObject(obj) { return new CuentaAhorros({ __restore: true, ...obj }); }
}
