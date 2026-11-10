/* Menú lateral ocultable. En escritorio se pliega; en móvil se abre como panel superpuesto. */
(function () {
  'use strict';
  var body = document.body;
  var toggle = document.getElementById('menu-toggle');
  var backdrop = document.getElementById('backdrop');
  var mobile = window.matchMedia('(max-width: 900px)');
  var KEY = 'pd.sidebar.collapsed';

  function read() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
  }

  function sync() {
    var open = mobile.matches ? body.classList.contains('sidebar-open') : !body.classList.contains('sidebar-collapsed');
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !(mobile.matches && open);
  }

  if (read()) body.classList.add('sidebar-collapsed');
  sync();

  toggle.addEventListener('click', function () {
    if (mobile.matches) {
      body.classList.toggle('sidebar-open');
    } else {
      var collapsed = body.classList.toggle('sidebar-collapsed');
      write(collapsed);
    }
    sync();
  });

  backdrop.addEventListener('click', function () {
    body.classList.remove('sidebar-open');
    sync();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('sidebar-open')) {
      body.classList.remove('sidebar-open');
      sync();
      toggle.focus();
    }
  });

  mobile.addEventListener('change', function () {
    body.classList.remove('sidebar-open');
    sync();
  });

  // Evita la animación del menú en la carga inicial.
  requestAnimationFrame(function () { body.classList.add('ready'); });
})();
