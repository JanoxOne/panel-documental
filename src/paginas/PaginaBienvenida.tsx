import { Link } from 'react-router-dom'
import { useSesion } from '../auth/ProveedorSesion'
import { SECCIONES } from '../estructura/secciones'

export function PaginaBienvenida() {
  const { sesion } = useSesion()
  return (
    <>
      <h1>Bienvenido, {sesion?.nombre}</h1>
      <p className="bienvenida__texto">
        Este es el Gestor Documental del Servicio de Salud Osorno. Elija una sección para comenzar.
      </p>
      <ul className="accesos">
        {SECCIONES.map(({ ruta, etiqueta, icono }) => (
          <li key={ruta}>
            <Link to={ruta} className="accesos__enlace">
              <i className={icono} aria-hidden="true" />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
