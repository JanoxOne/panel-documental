import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../App'
import { simularAncho } from '../pruebas/ancho'

const user = userEvent.setup()

function entrar(ruta = '/inicio') {
  sessionStorage.setItem(
    'gd.sesion',
    JSON.stringify({ usuario: 'admin', nombre: 'Administrador', rol: 'admin' }),
  )
  render(<App rutaInicial={ruta} />)
}

const botonMenu = () => screen.getByRole('button', { name: 'Menú' })
const menu = () => screen.queryByRole('navigation', { name: 'Menú principal' })

test('el menú lista las seis secciones en orden', () => {
  entrar()
  const enlaces = within(menu()!)
    .getAllByRole('link')
    .map((a) => a.textContent)
  expect(enlaces).toEqual([
    'Mi perfil',
    'Administración',
    'Bandeja de Entrada',
    'Bandeja de Salida',
    'Oficina de Partes',
    'Búsqueda de Documentos',
  ])
})

test('el botón oculta y muestra el menú', async () => {
  entrar()
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'true')
  await user.click(botonMenu())
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
  expect(menu()).not.toBeInTheDocument()
  await user.click(botonMenu())
  expect(menu()).toBeInTheDocument()
})

test('recuerda el menú oculto al volver a cargar', async () => {
  entrar()
  await user.click(botonMenu())
  expect(localStorage.getItem('gd.menuVisible')).toBe('0')
  cleanup()
  render(<App rutaInicial="/inicio" />)
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
})

test('navegar desde el menú muestra la sección y la marca como activa', async () => {
  entrar()
  const enlace = () => within(menu()!).getByRole('link', { name: 'Oficina de Partes' })
  await user.click(enlace())
  expect(screen.getByRole('heading', { name: 'Oficina de Partes' })).toBeInTheDocument()
  expect(enlace()).toHaveAttribute('aria-current', 'page')
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'true')
})

test('en pantalla angosta el menú parte oculto y se cierra al navegar', async () => {
  simularAncho(600)
  localStorage.setItem('gd.menuVisible', '1')
  entrar()
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
  await user.click(botonMenu())
  await user.click(within(menu()!).getByRole('link', { name: 'Mi perfil' }))
  expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
  expect(localStorage.getItem('gd.menuVisible')).toBe('1')
})

test('si localStorage falla, el menú igual funciona', async () => {
  const leer = Storage.prototype.getItem
  const escribir = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, clave) {
    if (clave === 'gd.menuVisible') throw new Error('bloqueado')
    return leer.call(this, clave)
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, clave, valor) {
    if (clave === 'gd.menuVisible') throw new Error('bloqueado')
    escribir.call(this, clave, valor)
  })
  entrar()
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'true')
  await user.click(botonMenu())
  expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
})

test('la bienvenida saluda al usuario y ofrece las seis secciones', () => {
  entrar()
  expect(screen.getByRole('heading', { name: 'Bienvenido, Administrador' })).toBeInTheDocument()
  expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(6)
})

test('el encabezado muestra el logo y el nombre del usuario', () => {
  entrar('/perfil')
  const encabezado = screen.getByRole('banner')
  expect(within(encabezado).getByAltText('Servicio de Salud Osorno')).toBeInTheDocument()
  expect(within(encabezado).getByText('Administrador')).toBeInTheDocument()
})

test('cerrar sesión vuelve al login y bloquea las vistas internas', async () => {
  entrar()
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  expect(sessionStorage.getItem('gd.sesion')).toBeNull()
})
