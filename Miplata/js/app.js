
const banco = new BancoService();
banco.load();
const auth  = new AuthService(banco);
// Íconos SVG para usar en la interfaz
const PAGES = ['landing','login','registro','dashboard'];

function showPage(name) {
  PAGES.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(`page-${name}`);
  if (target) target.style.display = 'block';
  window.scrollTo(0,0);
// Mostramos u ocultamos elementos de la interfaz según la página actual; por ejemplo, el navbar principal solo se muestra fuera del dashboard, y el topbar del dashboard solo se muestra dentro del dashboard
  const mainNav  = document.getElementById('main-navbar');
  const dashTop  = document.getElementById('dash-topbar');
  if (mainNav) mainNav.style.display = name === 'dashboard' ? 'none' : 'flex';
  if (dashTop) dashTop.style.display = name === 'dashboard' ? 'flex' : 'none';
}
// Función para lanzar el dashboard después de un login exitoso, pasando la instancia de autenticación y banco, y definiendo una función de callback para cerrar sesión y volver a la página de inicio
function launchDashboard() {
  const dashboard = new UIDashboard(auth, banco, () => {
    auth.logout();
    showPage('landing');
    uiLogin.reset();
  });
  dashboard.render();
}
// Instanciamos las interfaces de login y registro, pasando las dependencias necesarias (servicios de autenticación y banco) y definiendo callbacks para manejar el flujo entre páginas después de acciones exitosas (login o registro)
const uiLogin = new UILogin(auth, banco, () => {
  showPage('dashboard');
  launchDashboard();
});
// El registro redirige al login después de crear un nuevo cliente exitosamente
const uiRegistro = new UIRegistro(banco, () => {
  showPage('login');
  uiLogin.reset();
});
// Al cargar el DOM, configuramos los eventos para los enlaces de navegación, botones y otros elementos interactivos de la página, asegurándonos de mostrar la página correcta según la acción del usuario (login, registro, navegación dentro de la landing page, etc.)
document.addEventListener('DOMContentLoaded', () => {
  // Navbar
  document.getElementById('nav-login')?.addEventListener('click', () => { showPage('login'); uiLogin.reset(); });
  document.getElementById('nav-register')?.addEventListener('click', () => { showPage('registro'); uiRegistro.reset(); });
  document.getElementById('hero-btn-register')?.addEventListener('click', () => { showPage('registro'); uiRegistro.reset(); });
  document.getElementById('hero-btn-login')?.addEventListener('click', () => { showPage('login'); uiLogin.reset(); });
// Links del dashboard (Mis cuentas, Transferencias, Perfil)
  // Links entre páginas auth
  document.getElementById('link-to-registro')?.addEventListener('click', e => { e.preventDefault(); showPage('registro'); });
  document.getElementById('link-to-login')?.addEventListener('click', e => { e.preventDefault(); showPage('login'); uiLogin.reset(); });
// Links de navegación dentro de la landing page (Servicios, ¿Por qué MiPlata?)
  // Nav scroll links (Servicios / ¿Por qué MiPlata?)
  ['nav-servicios','nav-por-que'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      e.preventDefault();
      const href = document.getElementById(id).getAttribute('href');
      if (auth.estaAutenticado()) return;
      showPage('landing');
      setTimeout(() => {
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior:'smooth' });
      }, 50);
    });
  });
// Links del dashboard (Mis cuentas, Transferencias, Perfil)
  // Logo
  document.querySelectorAll('.nav-brand').forEach(el => {
    el.addEventListener('click', () => { if (!auth.estaAutenticado()) showPage('landing'); });
  });

  // Placeholder dinámico según tipo de documento en registro
  const tipoDoc = document.getElementById('reg-tipo-doc');
  const regId   = document.getElementById('reg-id');
  const docPlaceholders = { CC:'Ej: 1234567890', CE:'Ej: 987654321', PA:'Ej: AB123456', TI:'Ej: 1234567890' };
  tipoDoc?.addEventListener('change', () => {
    if (regId) regId.placeholder = docPlaceholders[tipoDoc.value] || '';
  });
// Al cargar la página, mostramos la landing page por defecto
  showPage('landing');
});
