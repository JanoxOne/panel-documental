import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorSesion, useSesion } from './auth/ProveedorSesion'
import { RutaProtegida } from './auth/RutaProtegida'
import { SECCIONES } from './estructura/secciones'
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
        <Route path="/inicio" element={<PaginaSeccion titulo="Bienvenida" />} />
        {SECCIONES.map(({ ruta, etiqueta }) => (
          <Route key={ruta} path={ruta} element={<PaginaSeccion titulo={etiqueta} />} />
        ))}
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
