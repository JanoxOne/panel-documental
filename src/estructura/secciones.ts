export interface Seccion {
  etiqueta: string
  ruta: string
  /** Clase de ícono del Kit Digital. */
  icono: string
}

export const SECCIONES: Seccion[] = [
  { etiqueta: 'Mi perfil', ruta: '/perfil', icono: 'cl cl-login' },
  { etiqueta: 'Administración', ruta: '/administracion', icono: 'cl cl-authority' },
  { etiqueta: 'Bandeja de Entrada', ruta: '/bandeja-entrada', icono: 'cl cl-download' },
  { etiqueta: 'Bandeja de Salida', ruta: '/bandeja-salida', icono: 'cl cl-give-letter' },
  { etiqueta: 'Oficina de Partes', ruta: '/oficina-partes', icono: 'cl cl-briefcase' },
  { etiqueta: 'Búsqueda de Documentos', ruta: '/busqueda', icono: 'cl cl-search' },
]
