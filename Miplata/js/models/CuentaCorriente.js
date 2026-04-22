/**
 * HERENCIA + POLIMORFISMO
 * CuentaCorriente extiende Cuenta.
 * retirar() permite hasta 20% de sobregiro sobre el saldo actual.
 * No genera intereses.
 */
class CuentaCorriente extends Cuenta {
  #porcentajeSobregiro;
// El constructor puede recibir un objeto para restaurar desde almacenamiento
  constructor(numeroCuenta, saldoInicial = 0) {
    super(numeroCuenta, saldoInicial);
    this.#porcentajeSobregiro = 0.20;
  }
// Getters para atributos privados
  getTipo()   { return 'Cuenta Corriente'; }
  getCodigo() { return 'CC'; }
  getPorcentajeSobregiro() { return this.#porcentajeSobregiro; }
// Método para calcular el límite de retiro considerando el sobregiro permitido
  getLimiteRetiro() {
    const saldo = this.getSaldo();
    if (saldo <= 0) return 0;
    return saldo + (saldo * this.#porcentajeSobregiro);
  }

  /**
   * POLIMORFISMO: retirar en Corriente permite hasta saldo + 20% sobregiro.
   * No aplica intereses.
   */
  retirar(monto) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto a retirar debe ser mayor a cero.');
    if (this.getEstado() !== EstadoCuenta.ACTIVA)
      throw new Error('La cuenta no está activa.');
// Calculamos el límite de retiro considerando el sobregiro permitido
    const limite = this.getLimiteRetiro();
    if (monto > limite)
      throw new Error(
        `Monto supera el límite permitido. Límite con sobregiro 20%: ${this._fmt(limite)}`
      );
// Si todo es válido, descontamos el monto del saldo (puede quedar negativo hasta el límite)
    this._setSaldo(this.getSaldo() - monto);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.RETIRO, monto, this.getSaldo(),
      `Retiro ${this._fmt(monto)} (límite disponible era ${this._fmt(limite)})`
    ));
    return { monto, limiteUsado: limite, saldoActual: this.getSaldo() };
  }
// POLIMORFISMO: consignar() es común pero cada tipo de cuenta puede tener reglas distintas (ej. bloqueos, límites)
  consignar(monto) { super.consignar(monto); }

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
    const limite = this.getLimiteRetiro();
    if (monto > limite)
      throw new Error(`Monto supera el límite disponible: ${this._fmt(limite)}`);
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
    return { ...super.toObject(), sobregiro: '20%', limiteRetiro: this.getLimiteRetiro() };
  }
// Convierte la cuenta a un objeto plano para almacenamiento, incluyendo movimientos (usado internamente)
  toStorageObject() { return super.toStorageObject(); }
  static fromObject(obj) { return new CuentaCorriente({ __restore: true, ...obj }); }
}
