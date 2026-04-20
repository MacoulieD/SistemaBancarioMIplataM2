/**
 * UIHelpers — utilidades compartidas para toda la interfaz MiPlata.
 */
const UIHelpers = {
// Formatea un valor numérico como moneda colombiana (COP) sin decimales, utilizando la API de internacionalización de JavaScript para mostrar el símbolo de moneda y el formato adecuado según la configuración regional de Colombia
  fmt(v) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(v);
  },
// Muestra una alerta en el elemento con el ID especificado, utilizando un tipo (success, error, warning) para determinar la clase CSS y el ícono a mostrar junto con el mensaje; si el elemento no existe, no se realiza ninguna acción
  showAlert(id, tipo, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    const icons = {
      success: Icons.check,
      error:   Icons.error,
      warning: Icons.alert
    };
    el.innerHTML = `${icons[tipo] || ''}<span>${msg}</span>`;
    el.className = `alert alert-${tipo}`;
    el.classList.remove('hidden');
  },
// Limpia el contenido y oculta el elemento de alerta con el ID especificado, restableciendo su clase a 'hidden' para ocultarlo
  clearAlert(id) {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = ''; el.className = 'hidden'; }
  },
// Muestra una alerta temporal que se oculta automáticamente después de un tiempo especificado (por defecto, 6000 milisegundos o 6 segundos), utilizando el método clearAlert para ocultar la alerta después del tiempo establecido
  autoHideAlert(id, ms = 6000) {
    setTimeout(() => this.clearAlert(id), ms);
  },
// Muestra un modal con el contenido HTML especificado, y configura los eventos para los botones de confirmación y cancelación si se proporcionan las funciones correspondientes; el modal se muestra superpuesto al contenido de la página, y se puede cerrar haciendo clic en el botón de cancelación o llamando al método closeModal
  showModal(html, onConfirm, onCancel) {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div class="modal-box">${html}</div>`;
    overlay.classList.remove('hidden');
// Configuramos los eventos para los botones de confirmación y cancelación del modal, llamando a las funciones proporcionadas si se hacen clic en los botones correspondientes, y cerrando el modal al hacer clic en el botón de cancelación
    const btnConfirm = document.getElementById('modal-confirm');
    const btnCancel  = document.getElementById('modal-cancel');
    if (btnConfirm) btnConfirm.addEventListener('click', () => { if(onConfirm) onConfirm(); });
    if (btnCancel)  btnCancel.addEventListener('click',  () => { this.closeModal(); if(onCancel) onCancel(); });
  },
// Cierra el modal ocultando el elemento de superposición, restableciendo su contenido a vacío y agregando la clase 'hidden' para ocultarlo
  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  },
// Devuelve las iniciales de un nombre completo, tomando la primera letra de cada palabra y convirtiéndolas a mayúsculas; si el nombre es vacío o no se proporciona, devuelve una cadena vacía
  initials(nombre) {
    return (nombre || '').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }
};
