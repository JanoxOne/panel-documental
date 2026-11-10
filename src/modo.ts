/**
 * Modo demo: `npm run build:demo` genera un único HTML que se abre con doble
 * clic (file://). Ahí no hay servidor para las rutas ni se puede cargar
 * Turnstile, así que las rutas van en el hash y el captcha se simula.
 */
export function esModoDemo(): boolean {
  return import.meta.env.MODE === 'demo'
}
