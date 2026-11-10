'use strict';
/** Secciones del menú lateral. `roles` limita quién ve la opción (vacío = todos). */
const MENU = [
  { slug: 'perfil', label: 'Mi perfil', icon: 'user', roles: [] },
  { slug: 'administracion', label: 'Administración', icon: 'settings', roles: ['admin'] },
  { slug: 'bandeja-entrada', label: 'Bandeja de Entrada', icon: 'inbox', roles: [] },
  { slug: 'bandeja-salida', label: 'Bandeja de Salida', icon: 'send', roles: [] },
  { slug: 'oficina-partes', label: 'Oficina de Partes', icon: 'building', roles: [] },
  { slug: 'busqueda', label: 'Búsqueda de Documentos', icon: 'search', roles: [] },
];

function menuFor(user) {
  return MENU.filter((item) => item.roles.length === 0 || (user && item.roles.includes(user.role)));
}

module.exports = { MENU, menuFor };
