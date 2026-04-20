// Movimiento.js
class Movimiento {
  #id;
  #fechaHora;
  #tipo;
  #valor;
  #saldoPosterior;
  #descripcion;
  static #contador = 1;
// El constructor puede recibir un objeto para restaurar desde almacenamiento o parámetros para crear un nuevo movimiento
  constructor(tipo, valor, saldoPosterior, descripcion = '') {
    if (tipo && typeof tipo === 'object' && tipo.__restore) {
      const r = tipo;
      this.#id             = r.id;
      this.#fechaHora      = new Date(r.fechaRaw || r.fechaHora);
      this.#tipo           = r.tipo;
      this.#valor          = r.valor;
      this.#saldoPosterior = r.saldoPosterior;
      this.#descripcion    = r.descripcion;
      if (r.id >= Movimiento.#contador) Movimiento.#contador = r.id + 1;
      return;
    }
    this.#id            = Movimiento.#contador++;
    this.#fechaHora     = new Date();
    this.#tipo          = tipo;
    this.#valor         = valor;
    this.#saldoPosterior= saldoPosterior;
    this.#descripcion   = descripcion;
  }
// Convierte el movimiento a un objeto plano para almacenamiento o transferencia
  static fromObject(obj) { return new Movimiento({ __restore: true, ...obj }); }
// Getters para atributos privados
  getId()              { return this.#id; }
  getFechaHora()       { return this.#fechaHora; }
  getTipo()            { return this.#tipo; }
  getValor()           { return this.#valor; }
  getSaldoPosterior()  { return this.#saldoPosterior; }
  getDescripcion()     { return this.#descripcion; }
// Devuelve la fecha formateada para mostrar al usuario
  getFechaFormateada() {
    return this.#fechaHora.toLocaleString('es-CO', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
// Convierte el movimiento a un objeto plano para almacenamiento, incluyendo fecha en formato raw (usado internamente)
  toObject() {
    return {
      id:            this.#id,
      fechaHora:     this.getFechaFormateada(),
      fechaRaw:      this.#fechaHora,
      tipo:          this.#tipo,
      valor:         this.#valor,
      saldoPosterior:this.#saldoPosterior,
      descripcion:   this.#descripcion
    };
  }
}
