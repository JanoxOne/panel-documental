import { expect, test } from 'vitest'
import { cerrarSesion, iniciarSesion, obtenerSesion } from './auth'

const admin = { usuario: 'admin', nombre: 'Administrador', rol: 'admin' }

test('credenciales correctas inician y guardan la sesión', () => {
  const r = iniciarSesion('admin', 'admin123', 'token')
  expect(r).toEqual({ ok: true, sesion: admin })
  expect(obtenerSesion()).toEqual(admin)
})

test('acepta el usuario con espacios y mayúsculas', () => {
  expect(iniciarSesion('  Admin ', 'admin123', 'token').ok).toBe(true)
})

test('contraseña incorrecta, incluso por mayúsculas o espacios, se rechaza', () => {
  expect(iniciarSesion('admin', 'Admin123', 'token')).toEqual({ ok: false, error: 'credenciales' })
  expect(iniciarSesion('admin', 'admin123 ', 'token')).toEqual({ ok: false, error: 'credenciales' })
  expect(obtenerSesion()).toBeNull()
})

test('sin token de captcha se rechaza aunque las credenciales sean correctas', () => {
  expect(iniciarSesion('admin', 'admin123', '')).toEqual({ ok: false, error: 'captcha' })
  expect(obtenerSesion()).toBeNull()
})

test('cerrarSesion borra la sesión', () => {
  iniciarSesion('admin', 'admin123', 'token')
  cerrarSesion()
  expect(obtenerSesion()).toBeNull()
})

test.each(['{no es json', '"texto"', '{"usuario":1}', 'null'])(
  'sesión guardada inválida (%s) cuenta como sin sesión',
  (valor) => {
    sessionStorage.setItem('gd.sesion', valor)
    expect(obtenerSesion()).toBeNull()
  },
)
