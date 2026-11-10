import { NavLink } from 'react-router-dom'
import { SECCIONES } from './secciones'


export function MenuLateral({ visible, alNavegar }: { visible: boolean; alNavegar(): void }) {
  return (
    <nav id="menu-principal" className="menu" aria-label="Menú principal" hidden={!visible}>
      <ul className="menu__lista">
        {SECCIONES.map(({ ruta, etiqueta, icono }) => (
          <li key={ruta}>
            <NavLink to={ruta} className="menu__enlace" onClick={alNavegar}>
              <i className={icono} aria-hidden="true" />
              {etiqueta}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
