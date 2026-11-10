// Autenticación simulada. Es el único módulo que cambia al conectar un backend.

export interface Sesion {
  usuario: string
  nombre: string
  rol: 'admin'
}

export type ResultadoLogin =
  | { ok: true; sesion: Sesion }
  | { ok: false; error: 'credenciales' | 'captcha' }

const CLAVE_SESION = 'gd.sesion'
const USUARIO_DEMO = 'admin'
const CONTRASENA_DEMO = 'admin123'

export function iniciarSesion(
  usuario: string,
  contrasena: string,
  tokenCaptcha: string,
): ResultadoLogin {
  if (!tokenCaptcha) return { ok: false, error: 'captcha' }
  if (usuario.trim().toLowerCase() !== USUARIO_DEMO || contrasena !== CONTRASENA_DEMO) {
    return { ok: false, error: 'credenciales' }
  }
  const sesion: Sesion = { usuario: USUARIO_DEMO, nombre: 'Administrador', rol: 'admin' }
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
  } catch {
    // Sin almacenamiento la sesión dura hasta recargar la página.
  }
  return { ok: true, sesion }
}

export function cerrarSesion(): void {
  try {
    sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Nada que borrar.
  }
}

export function obtenerSesion(): Sesion | null {
  try {
    const valor: unknown = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null')
    if (typeof valor !== 'object' || valor === null) return null
    const { usuario, nombre, rol } = valor as Record<string, unknown>
    if (typeof usuario !== 'string' || typeof nombre !== 'string' || rol !== 'admin') return null
    return { usuario, nombre, rol }
  } catch {
    return null
  }
}
