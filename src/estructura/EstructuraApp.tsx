import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import logo from '../assets/logo-ss-osorno.jpg'
import { useSesion } from '../auth/ProveedorSesion'
import { MenuLateral } from './MenuLateral'

const CLAVE_MENU = 'gd.menuVisible'
const PANTALLA_ANCHA = '(min-width: 992px)'

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE_MENU) !== '0'
  } catch {
    return true
  }
}

function guardarPreferencia(visible: boolean) {
  try {
    localStorage.setItem(CLAVE_MENU, visible ? '1' : '0')
  } catch {
    // Sin almacenamiento el menú funciona igual, solo no recuerda su estado.
  }
}

export function EstructuraApp() {
  const { sesion, cerrarSesion } = useSesion()
  const [ancha, setAncha] = useState(() => window.matchMedia(PANTALLA_ANCHA).matches)
  const [menuVisible, setMenuVisible] = useState(() => ancha && leerPreferencia())

  useEffect(() => {
    const consulta = window.matchMedia(PANTALLA_ANCHA)
    const alCambiar = () => {
      setAncha(consulta.matches)
      setMenuVisible(consulta.matches && leerPreferencia())
    }
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  function alternarMenu() {
    const visible = !menuVisible
    setMenuVisible(visible)
    if (ancha) guardarPreferencia(visible)
  }

  function cerrarEnPantallaAngosta() {
    if (!ancha) setMenuVisible(false)
  }

  return (
    <div className="estructura">
      <header className="encabezado">
        <button
          type="button"
          className="encabezado__boton-menu"
          aria-label="Menú"
          aria-expanded={menuVisible}
          aria-controls="menu-principal"
          onClick={alternarMenu}
        >
          <i className="cl cl-burger" aria-hidden="true" />
        </button>
        <Link to="/inicio" className="encabezado__marca">
          <img className="encabezado__logo" src={logo} alt="Servicio de Salud Osorno" />
          <span className="encabezado__nombre">Gestor Documental</span>
        </Link>
        <div className="encabezado__usuario">
          <span className="encabezado__nombre-usuario">{sesion?.nombre}</span>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="estructura__cuerpo">
        <MenuLateral visible={menuVisible} alNavegar={cerrarEnPantallaAngosta} />
        {menuVisible && !ancha && (
          <div className="estructura__fondo" onClick={() => setMenuVisible(false)} />
        )}
        <main className="estructura__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
