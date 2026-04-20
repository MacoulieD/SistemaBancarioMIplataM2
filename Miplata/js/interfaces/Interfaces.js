// Interfaces para el sistema bancario MiPlata

/**
 * ITransaction — define las operaciones básicas de una cuenta bancaria.
 */
class ITransaction {
  consignar(monto)        { throw new Error('consignar() no implementado.'); }
  retirar(monto)          { throw new Error('retirar() no implementado.'); }
  consultarSaldo()        { throw new Error('consultarSaldo() no implementado.'); }
  obtenerMovimientos()    { throw new Error('obtenerMovimientos() no implementado.'); }
}
// POLIMORFISMO: cada tipo de cuenta implementa ITransaction a su manera
class ITransferible {
  transferir(destino, monto) { throw new Error('transferir() no implementado.'); }
  validarDestino(c)          { throw new Error('validarDestino() no implementado.'); }
}
// POLIMORFISMO: cada tipo de cuenta implementa ITransferible a su manera
class IEditable {
  editarPerfil(datos) { throw new Error('editarPerfil() no implementado.'); }
}
// POLIMORFISMO: cada cliente implementa IEditable a su manera
class IAutenticable {
  autenticar(usuario, contrasena) { throw new Error('autenticar() no implementado.'); }
  cerrarSesion()                  { throw new Error('cerrarSesion() no implementado.'); }
  cambiarContrasena(old, nuevo)   { throw new Error('cambiarContrasena() no implementado.'); }
}
