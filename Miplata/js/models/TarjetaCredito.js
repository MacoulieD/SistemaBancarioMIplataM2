/**
 * HERENCIA + POLIMORFISMO
 * TarjetaCredito extiende Cuenta.
 * Cupo fijo: $4.000.000. Se obtiene por solicitud en el dashboard.
 * #compras rastrea cada compra con cuotasPagadas para mostrar estado individual.
 */
class TarjetaCredito extends Cuenta {
  #cupo;
  #deuda;
  #deudaConIntereses;
  #compras; // [{ id, monto, cuotas, cuotaMensual, cuotasPagadas }]

  static CUPO_MAXIMO = 4000000;

  constructor(numeroCuenta) {
    super(numeroCuenta, 0);
    if (numeroCuenta && typeof numeroCuenta === 'object' && numeroCuenta.__restore) {
      this.#cupo    = TarjetaCredito.CUPO_MAXIMO;
      this.#deuda   = numeroCuenta.deuda || 0;
      this.#compras = (numeroCuenta.compras || []).map(c => ({ ...c }));
      if (numeroCuenta.deudaConIntereses !== undefined) {
        this.#deudaConIntereses = numeroCuenta.deudaConIntereses;
      } else {
        // Recalcular desde movimientos almacenados (compatibilidad con datos anteriores)
        const movs = numeroCuenta.movimientos || [];
        const totalCompras = movs
          .filter(m => m.tipo === 'COMPRA_TC')
          .reduce((sum, m) => {
            const match = (m.descripcion || '').match(/a (\d+) cuota/);
            const n = match ? parseInt(match[1]) : 1;
            return sum + this.calcularCuotaMensual(m.valor, n) * n;
          }, 0);
        const totalPagado = movs
          .filter(m => m.tipo === 'PAGO_TC' || m.tipo === 'TRANSFERENCIA_IN')
          .reduce((sum, m) => sum + (m.valor || 0), 0);
        this.#deudaConIntereses = Math.max(0, totalCompras - totalPagado);
      }
      return;
    }
    this.#cupo              = TarjetaCredito.CUPO_MAXIMO;
    this.#deuda             = 0;
    this.#deudaConIntereses = 0;
    this.#compras           = [];
  }

  getTipo()              { return 'Tarjeta de Crédito'; }
  getCodigo()            { return 'TC'; }
  getCupo()              { return this.#cupo; }
  getDeuda()             { return this.#deuda; }
  getDeudaConIntereses() { return this.#deudaConIntereses; }
  getCupoDisponible()    { return this.#cupo - this.#deuda; }
  getCompras()           { return this.#compras.map(c => ({ ...c })); }

  calcularTasa(cuotas) {
    if (cuotas <= 2) return 0;
    if (cuotas <= 6) return 0.019;
    return 0.023;
  }

  calcularCuotaMensual(capital, cuotas) {
    const tasa = this.calcularTasa(cuotas);
    if (tasa === 0) return capital / cuotas;
    return (capital * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
  }

  comprar(monto, cuotas) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto de compra debe ser mayor a cero.');
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 36)
      throw new Error('El número de cuotas debe ser entre 1 y 36.');
    if (this.getEstado() !== EstadoCuenta.ACTIVA)
      throw new Error('La tarjeta no está activa.');
    if (monto > this.getCupoDisponible())
      throw new Error(`Cupo insuficiente. Disponible: ${this._fmt(this.getCupoDisponible())}`);

    const tasa         = this.calcularTasa(cuotas);
    const cuotaMensual = this.calcularCuotaMensual(monto, cuotas);
    this.#deuda             += monto;
    this.#deudaConIntereses += cuotaMensual * cuotas;
    this.#compras.push({ id: Date.now(), monto, cuotas, cuotaMensual, cuotasPagadas: 0 });

    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.COMPRA_TC, monto, this.getCupoDisponible(),
      `Compra ${this._fmt(monto)} a ${cuotas} cuota(s) · Cuota mensual: ${this._fmt(cuotaMensual)} · Tasa: ${(tasa * 100).toFixed(1)}%`
    ));
    return { monto, cuotas, tasa, cuotaMensual, deudaTotal: this.#deudaConIntereses, cupoDisponible: this.getCupoDisponible() };
  }

  #marcarCuotas(monto) {
    let restante = monto;
    for (const c of this.#compras) {
      while (c.cuotasPagadas < c.cuotas && restante >= c.cuotaMensual - 0.01) {
        restante -= c.cuotaMensual;
        c.cuotasPagadas++;
      }
    }
  }

  pagar(monto) {
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El pago debe ser mayor a cero.');
    if (this.#deudaConIntereses === 0)
      throw new Error('No tiene deuda pendiente.');
    if (monto > this.#deudaConIntereses)
      throw new Error(`El pago (${this._fmt(monto)}) supera la deuda total (${this._fmt(this.#deudaConIntereses)}).`);

    this.#deuda             = Math.max(0, this.#deuda             - monto);
    this.#deudaConIntereses = Math.max(0, this.#deudaConIntereses - monto);
    this.#marcarCuotas(monto);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.PAGO_TC, monto, this.getCupoDisponible(),
      `Pago tarjeta ${this._fmt(monto)}. Deuda restante: ${this._fmt(this.#deudaConIntereses)}`
    ));
    return { montoPagado: monto, deudaRestante: this.#deudaConIntereses };
  }

  retirar(monto, cuotas = 1) { return this.comprar(monto, cuotas); }

  validarDestino(destino) {
    if (!destino) throw new Error('Cuenta destino no válida.');
    if (destino.getNumeroCuenta() === this.getNumeroCuenta())
      throw new Error('No se permite transferir al mismo producto.');
    return true;
  }

  transferir(destino, monto) {
    this.validarDestino(destino);
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0)
      throw new Error('El monto a transferir debe ser mayor a cero.');
    if (monto > this.getCupoDisponible())
      throw new Error(`Cupo insuficiente. Disponible: ${this._fmt(this.getCupoDisponible())}`);
    this.#deuda             += monto;
    this.#deudaConIntereses += monto;
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.TRANSFERENCIA_OUT, monto, this.getCupoDisponible(),
      `Avance en efectivo a cuenta ${destino.getNumeroCuenta()}`
    ));
    destino._recibirTransferencia(monto, this.getNumeroCuenta());
  }

  _recibirTransferencia(monto, origen) {
    this.#deuda             = Math.max(0, this.#deuda             - monto);
    this.#deudaConIntereses = Math.max(0, this.#deudaConIntereses - monto);
    this.#marcarCuotas(monto);
    this.registrarMovimiento(new Movimiento(
      TipoMovimiento.TRANSFERENCIA_IN, monto, this.getCupoDisponible(),
      `Abono recibido desde cuenta ${origen}. Deuda restante: ${this._fmt(this.#deudaConIntereses)}`
    ));
  }

  toObject() {
    return { ...super.toObject(), cupo: this.#cupo, deuda: this.#deuda, deudaConIntereses: this.#deudaConIntereses, cupoDisponible: this.getCupoDisponible() };
  }
  toStorageObject() {
    return { ...super.toStorageObject(), deuda: this.#deuda, deudaConIntereses: this.#deudaConIntereses, compras: this.#compras };
  }
  static fromObject(obj) { return new TarjetaCredito({ __restore: true, ...obj }); }
}
