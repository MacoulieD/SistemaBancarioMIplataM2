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
   * POLIMORFISMO: retirar en Ahorros descuenta monto + 1.5% de interés.
   * Restricción: monto + interés no puede superar el saldo disponible.
   */
  retirar(monto) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto a retirar debe ser mayor a cero.');
    if (this.getEstado() !== EstadoCuenta.ACTIVA)
      throw new Error('La cuenta no está activa.');
// Calculamos el interés y el total a descontar
    const interes       = this.calcularIntereses(monto);
    const totalDescontar= monto + interes;
// Verificamos que el total a descontar no supere el saldo disponible
    if (totalDescontar > this.getSaldo())
      throw new Error(
        `Saldo insuficiente. Retiro ${this._fmt(monto)} + interés 1.5% (${this._fmt(interes)}) = ${this._fmt(totalDescontar)}. Disponible: ${this._fmt(this.getSaldo())}`
      );
// Si todo es válido, descontamos el total (monto + interés) del saldo
    this._setSaldo(this.getSaldo() - totalDescontar);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.RETIRO, monto, this.getSaldo(),
      `Retiro ${this._fmt(monto)} + interés 1.5% (${this._fmt(interes)})`
    ));
    return { monto, interes, totalDescontar, saldoActual: this.getSaldo() };
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
