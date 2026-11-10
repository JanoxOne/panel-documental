import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorSesion, useSesion } from './auth/ProveedorSesion'
import { RutaProtegida } from './auth/RutaProtegida'
import { EstructuraApp } from './estructura/EstructuraApp'
import { SECCIONES } from './estructura/secciones'
import { PaginaBienvenida } from './paginas/PaginaBienvenida'
import { PaginaLogin } from './paginas/PaginaLogin'
import { PaginaSeccion } from './paginas/PaginaSeccion'

function Raiz() {
  const { sesion } = useSesion()
  return sesion ? <Navigate to="/inicio" replace /> : <PaginaLogin />
}

function Rutas() {
  return (
    <Routes>
      <Route path="/" element={<Raiz />} />
      <Route element={<RutaProtegida />}>
        <Route element={<EstructuraApp />}>
          <Route path="/inicio" element={<PaginaBienvenida />} />
          {SECCIONES.map(({ ruta, etiqueta }) => (
            <Route key={ruta} path={ruta} element={<PaginaSeccion titulo={etiqueta} />} />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App({ rutaInicial }: { rutaInicial?: string }) {
  return (
    <ProveedorSesion>
      {rutaInicial ? (
        <MemoryRouter initialEntries={[rutaInicial]}>
          <Rutas />
        </MemoryRouter>
      ) : (
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      )}
    </ProveedorSesion>
  )
}
