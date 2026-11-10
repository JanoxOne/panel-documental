# Gestor Documental — base de frontend: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la base navegable del Gestor Documental: login con captcha oculto, bienvenida y estructura con menú lateral ocultable de seis secciones.

**Architecture:** SPA de React con React Router. Un módulo `auth` sin UI simula el login y es el único punto que cambia al conectar un backend; un contexto expone la sesión; las rutas internas viven dentro de `EstructuraApp` detrás de `RutaProtegida`. El Kit Digital se usa solo como CSS.

**Tech Stack:** Vite, React 18+, TypeScript, React Router, `@gobdigital-cl/gob.cl` 3.0.10 (solo CSS), Cloudflare Turnstile invisible, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-10-gestor-documental-base-design.md`

## Global Constraints

- Kit Digital: importar solo `@gobdigital-cl/gob.cl/dist/css/gob.cl.css`. No instalar ni cargar jQuery, Popper ni el JS de Bootstrap.
- Todo el texto visible va en español. Nombres de código en español, como en la spec.
- Credenciales de demostración: usuario `admin`, contraseña `admin123`.
- Clave de Turnstile: `import.meta.env.VITE_TURNSTILE_SITE_KEY`, con valor por defecto `1x00000000000000000000BB`.
- Claves de almacenamiento: sesión en `sessionStorage['gd.sesion']`; estado del menú en `localStorage['gd.menuVisible']`.
- Punto de quiebre del menú: 992 px.
- Texto alternativo del logo: `Servicio de Salud Osorno`.
- Mensajes exactos: `Usuario o contraseña incorrectos` y `No se pudo verificar el captcha. Intente nuevamente`.
- `npm run build` y `npm test` deben terminar sin errores al final de cada tarea.
- Cada commit termina con las líneas de atribución de la sesión.

## Review Focus

1. `sessionStorage['gd.sesion']` con un valor corrupto o con forma inesperada → se trata como "sin sesión", sin romper la app. (Tarea 2)
2. Usuario con espacios alrededor o mayúsculas (`" Admin "`) → se acepta; la contraseña se compara exacta. (Tarea 2)
3. El script de Turnstile no carga (bloqueador, sin red) → `ejecutar()` rechaza a los 10 s como máximo, se muestra la alerta de captcha y el botón vuelve a habilitarse. (Tarea 4)
4. Doble envío del formulario (doble clic, Enter repetido) → un solo intento de login. (Tarea 4)
5. `localStorage` no disponible o lanza excepción → el menú funciona igual, visible por defecto, sin recordar estado. (Tarea 5)

## Estructura de archivos

```
index.html
vite.config.ts            # incluye la configuración de Vitest
src/main.tsx              # monta <App/> e importa el CSS del Kit Digital
src/App.tsx               # proveedor de sesión + tabla de rutas
src/estilos.css           # estilos propios (estructura, menú, login)
src/assets/logo-ss-osorno.jpg
src/auth/auth.ts          # login simulado y persistencia de sesión
src/auth/ProveedorSesion.tsx
src/auth/RutaProtegida.tsx
src/captcha/CaptchaOculto.tsx
src/paginas/PaginaLogin.tsx
src/paginas/PaginaBienvenida.tsx
src/paginas/PaginaSeccion.tsx
src/estructura/secciones.ts
src/estructura/EstructuraApp.tsx
src/estructura/MenuLateral.tsx
src/pruebas/setup.ts      # jest-dom + limpieza de storage entre pruebas
```

Las pruebas viven junto a cada archivo como `*.test.ts(x)`.

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/estilos.css`, `src/pruebas/setup.ts`, `src/assets/logo-ss-osorno.jpg`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: scripts `npm run dev`, `npm run build`, `npm test` (`vitest run`); `App` como export por defecto de `src/App.tsx`.

- [ ] **Step 1: Crear el proyecto** con la plantilla `react-ts` de Vite en la raíz del repo (conservando `README.md` y `docs/`), quitar el contenido de ejemplo de la plantilla e instalar `react-router-dom`, `@gobdigital-cl/gob.cl@3.0.10` y, como dependencias de desarrollo, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- [ ] **Step 2: Configurar Vitest** en `vite.config.ts`: `environment: 'jsdom'`, `setupFiles: 'src/pruebas/setup.ts'`, `css: false`. `setup.ts` importa `@testing-library/jest-dom/vitest` y vacía `sessionStorage` y `localStorage` en `afterEach`.
- [ ] **Step 3: Copiar el logo** desde la imagen entregada por el usuario a `src/assets/logo-ss-osorno.jpg`.
- [ ] **Step 4: Escribir la prueba de humo que falla**

```tsx
// src/App.test.tsx
test('la raíz muestra el login', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Implementar** `index.html` (`lang="es"`, título `Gestor Documental`), `main.tsx` (importa el CSS del Kit Digital y `estilos.css`) y un `App` mínimo que muestre el encabezado `Gestor Documental`.
- [ ] **Step 6: Verificar** — `npm test` → 1 prueba pasa; `npm run build` → termina sin errores.
- [ ] **Step 7: Commit** — `Crea el proyecto Vite + React con Kit Digital`

---

### Task 2: Módulo `auth`

**Files:**
- Create: `src/auth/auth.ts`
- Test: `src/auth/auth.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Sesion { usuario: string; nombre: string; rol: 'admin' }
export type ResultadoLogin =
  | { ok: true; sesion: Sesion }
  | { ok: false; error: 'credenciales' | 'captcha' }
export function iniciarSesion(usuario: string, contrasena: string, tokenCaptcha: string): ResultadoLogin
export function cerrarSesion(): void
export function obtenerSesion(): Sesion | null
```

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
test('credenciales correctas inician y guardan la sesión', () => {
  const r = iniciarSesion('admin', 'admin123', 'token')
  expect(r).toEqual({ ok: true, sesion: { usuario: 'admin', nombre: 'Administrador', rol: 'admin' } })
  expect(obtenerSesion()).toEqual({ usuario: 'admin', nombre: 'Administrador', rol: 'admin' })
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
  iniciarSesion('admin', 'admin123', 'token'); cerrarSesion()
  expect(obtenerSesion()).toBeNull()
})
test.each(['{no es json', '"texto"', '{"usuario":1}', 'null'])(
  'sesión guardada inválida (%s) cuenta como sin sesión', (valor) => {
    sessionStorage.setItem('gd.sesion', valor)
    expect(obtenerSesion()).toBeNull()
  })
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run src/auth/auth.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar `src/auth/auth.ts`** con las firmas de arriba. El captcha se valida antes que las credenciales. `obtenerSesion` valida que el valor leído tenga `usuario` y `nombre` de tipo string y `rol === 'admin'`.
- [ ] **Step 4: Verificar que pasan** — mismo comando → PASS.
- [ ] **Step 5: Commit** — `Agrega módulo de autenticación simulada`

---

### Task 3: Sesión, rutas y protección

**Files:**
- Create: `src/auth/ProveedorSesion.tsx`, `src/auth/RutaProtegida.tsx`, `src/estructura/secciones.ts`, `src/paginas/PaginaSeccion.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `auth` (Task 2).
- Produces:

```ts
// ProveedorSesion.tsx
export function ProveedorSesion(props: { children: ReactNode }): JSX.Element
export function useSesion(): {
  sesion: Sesion | null
  iniciarSesion(usuario: string, contrasena: string, tokenCaptcha: string): ResultadoLogin
  cerrarSesion(): void
}
// RutaProtegida.tsx — renderiza <Outlet/> con sesión; si no, <Navigate to="/" replace/>
export function RutaProtegida(): JSX.Element
// secciones.ts — en este orden exacto
export interface Seccion { etiqueta: string; ruta: string; icono: string }
export const SECCIONES: Seccion[] = [
  { etiqueta: 'Mi perfil', ruta: '/perfil', icono: … },
  { etiqueta: 'Administración', ruta: '/administracion', icono: … },
  { etiqueta: 'Bandeja de Entrada', ruta: '/bandeja-entrada', icono: … },
  { etiqueta: 'Bandeja de Salida', ruta: '/bandeja-salida', icono: … },
  { etiqueta: 'Oficina de Partes', ruta: '/oficina-partes', icono: … },
  { etiqueta: 'Búsqueda de Documentos', ruta: '/busqueda', icono: … },
]
// PaginaSeccion.tsx — <h1>{titulo}</h1> y el texto "Sección en construcción"
export function PaginaSeccion(props: { titulo: string }): JSX.Element
// App.tsx — acepta el router para poder probar con rutas iniciales
export default function App(props: { rutaInicial?: string }): JSX.Element
```

`icono` es una clase de ícono del Kit Digital (`cl cl-…`); elegir en `node_modules/@gobdigital-cl/gob.cl/dist/fonts/gob-cl.json` la más cercana a cada sección.

`App` usa `MemoryRouter` con `initialEntries` cuando recibe `rutaInicial` y `BrowserRouter` cuando no. En esta tarea `/inicio` muestra un `PaginaSeccion` provisional con título `Bienvenida` y `/` un login provisional; las tareas 4 y 5 los reemplazan.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
const conSesion = () => sessionStorage.setItem('gd.sesion',
  JSON.stringify({ usuario: 'admin', nombre: 'Administrador', rol: 'admin' }))

test.each(['/inicio', '/perfil', '/administracion', '/bandeja-entrada',
  '/bandeja-salida', '/oficina-partes', '/busqueda'])(
  'sin sesión, %s redirige al login', (ruta) => {
    render(<App rutaInicial={ruta} />)
    expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
    expect(screen.queryByText('Sección en construcción')).not.toBeInTheDocument()
  })
test('con sesión, / redirige a la bienvenida', () => {
  conSesion(); render(<App rutaInicial="/" />)
  expect(screen.getByRole('heading', { name: /Bienvenid/ })).toBeInTheDocument()
})
test.each(SECCIONES)('con sesión, $ruta muestra "$etiqueta"', ({ ruta, etiqueta }) => {
  conSesion(); render(<App rutaInicial={ruta} />)
  expect(screen.getByRole('heading', { name: etiqueta })).toBeInTheDocument()
})
test('una ruta desconocida redirige al login', () => {
  render(<App rutaInicial="/no-existe" />)
  expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run src/App.test.tsx` → FAIL.
- [ ] **Step 3: Implementar** los cuatro archivos y la tabla de rutas de la spec en `App.tsx`. `ProveedorSesion` inicializa su estado con `obtenerSesion()` y lo actualiza al iniciar y cerrar sesión.
- [ ] **Step 4: Verificar que pasan** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `Agrega sesión, rutas y protección de vistas internas`

---

### Task 4: Captcha oculto y página de login

**Files:**
- Create: `src/captcha/CaptchaOculto.tsx`, `src/paginas/PaginaLogin.tsx`
- Modify: `src/App.tsx` (usar `PaginaLogin` en `/`), `src/estilos.css`
- Test: `src/paginas/PaginaLogin.test.tsx`, `src/captcha/CaptchaOculto.test.tsx`

**Interfaces:**
- Consumes: `useSesion()` (Task 3).
- Produces:

```ts
// CaptchaOculto.tsx
export interface CaptchaHandle { ejecutar(): Promise<string> }
export const CaptchaOculto: ForwardRefExoticComponent<RefAttributes<CaptchaHandle>>
export const TIEMPO_MAXIMO_CAPTCHA_MS = 10_000
// PaginaLogin.tsx
export function PaginaLogin(): JSX.Element
```

`CaptchaOculto` inserta una sola vez el script `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, llama a `window.turnstile.render(contenedor, { sitekey, size: 'invisible', execution: 'execute', callback, 'error-callback' })` y en `ejecutar()` hace `reset` + `execute` y resuelve con el token. `ejecutar()` rechaza si el script no cargó, si Turnstile informa error o si pasan `TIEMPO_MAXIMO_CAPTCHA_MS` sin token. Al desmontar llama a `turnstile.remove`.

`PaginaLogin`: logo, encabezado `Gestor Documental`, aviso `Ambiente de demostración` con las credenciales, campos con etiquetas `Usuario` y `Contraseña` (`autocomplete` `username` y `current-password`), botón `Ingresar`. Los mensajes de campo vacío son `Ingrese su usuario` e `Ingrese su contraseña`. Las alertas usan `role="alert"`.

- [ ] **Step 1: Escribir las pruebas de `PaginaLogin` que fallan** (con `vi.mock('../captcha/CaptchaOculto')` sustituido por un doble cuyo `ejecutar` es un `vi.fn()` controlable)

```tsx
test('campos vacíos muestran mensajes y no ejecutan el captcha', async () => {
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
  expect(screen.getByText('Ingrese su usuario')).toBeInTheDocument()
  expect(screen.getByText('Ingrese su contraseña')).toBeInTheDocument()
  expect(ejecutar).not.toHaveBeenCalled()
})
test('credenciales correctas llevan a la bienvenida', async () => {
  ejecutar.mockResolvedValue('token')
  await ingresar('admin', 'admin123')
  expect(await screen.findByRole('heading', { name: /Bienvenid/ })).toBeInTheDocument()
})
test('credenciales incorrectas muestran la alerta y limpian la contraseña', async () => {
  ejecutar.mockResolvedValue('token')
  await ingresar('admin', 'mala')
  expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
  expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  expect(screen.getByLabelText('Usuario')).toHaveValue('admin')
})
test('si el captcha falla se avisa, no hay sesión y se puede reintentar', async () => {
  ejecutar.mockRejectedValue(new Error('captcha'))
  await ingresar('admin', 'admin123')
  expect(await screen.findByRole('alert'))
    .toHaveTextContent('No se pudo verificar el captcha. Intente nuevamente')
  expect(sessionStorage.getItem('gd.sesion')).toBeNull()
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
})
test('mientras se envía, el botón está deshabilitado y hay un solo intento', async () => {
  ejecutar.mockReturnValue(new Promise(() => {}))
  await ingresar('admin', 'admin123')
  const boton = screen.getByRole('button', { name: /Ingres/ })
  expect(boton).toBeDisabled()
  await user.type(screen.getByLabelText('Contraseña'), '{Enter}')
  expect(ejecutar).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Escribir las pruebas de `CaptchaOculto` que fallan** (con `window.turnstile` simulado y temporizadores falsos)

```tsx
test('ejecutar resuelve con el token que entrega Turnstile', …)  // callback('tok') → 'tok'
test('ejecutar rechaza si Turnstile informa error', …)           // 'error-callback'
test('ejecutar rechaza a los 10 s si no hay respuesta', …)       // avanzar TIEMPO_MAXIMO_CAPTCHA_MS
test('usa la clave de prueba cuando no hay variable de entorno', …)
  // render recibe sitekey '1x00000000000000000000BB' y size 'invisible'
```

- [ ] **Step 3: Verificar que fallan** — `npx vitest run src/paginas src/captcha` → FAIL.
- [ ] **Step 4: Implementar** `CaptchaOculto` y `PaginaLogin`, con estilos de login centrado en `estilos.css` usando componentes de formulario, botón y alerta del Kit Digital.
- [ ] **Step 5: Verificar que pasan** — `npm test` → PASS; `npm run build` → sin errores.
- [ ] **Step 6: Commit** — `Agrega login con captcha oculto Turnstile`

---

### Task 5: Estructura con menú lateral y bienvenida

**Files:**
- Create: `src/estructura/EstructuraApp.tsx`, `src/estructura/MenuLateral.tsx`, `src/paginas/PaginaBienvenida.tsx`
- Modify: `src/App.tsx` (rutas internas dentro de `EstructuraApp`; `/inicio` usa `PaginaBienvenida`), `src/estilos.css`
- Test: `src/estructura/EstructuraApp.test.tsx`

**Interfaces:**
- Consumes: `useSesion()`, `SECCIONES` (Task 3).
- Produces:

```ts
// EstructuraApp.tsx — encabezado + menú + <Outlet/> dentro de <main>
export function EstructuraApp(): JSX.Element
// MenuLateral.tsx — <nav aria-label="Menú principal"> con un NavLink por sección
export function MenuLateral(props: { visible: boolean; alNavegar(): void }): JSX.Element
// PaginaBienvenida.tsx — <h1>Bienvenido, {nombre}</h1> + accesos directos a SECCIONES
export function PaginaBienvenida(): JSX.Element
```

El botón del menú tiene nombre accesible `Menú`, `aria-expanded` y `aria-controls` apuntando al `nav`. Con el menú oculto el `nav` lleva el atributo `hidden`. Estado inicial: en ventana de 992 px o más, lo guardado en `localStorage['gd.menuVisible']` (`'1'`/`'0'`) o visible si no hay nada; bajo 992 px, oculto siempre. Solo se guarda el estado en ventana ancha. `alNavegar` oculta el menú únicamente bajo 992 px. El ancho se lee con `window.matchMedia('(min-width: 992px)')`. Toda lectura y escritura de `localStorage` va dentro de `try/catch`.

El encabezado muestra el logo, `Gestor Documental`, el `nombre` de la sesión y un botón `Cerrar sesión` que llama a `cerrarSesion()` y navega a `/`.

- [ ] **Step 1: Escribir las pruebas que fallan** (helper `ancho(px)` que simula `matchMedia`; render de `<App rutaInicial="/inicio" />` con sesión)

```tsx
test('el menú lista las seis secciones en orden', () => {
  const enlaces = within(screen.getByRole('navigation', { name: 'Menú principal' }))
    .getAllByRole('link').map((a) => a.textContent)
  expect(enlaces).toEqual(['Mi perfil', 'Administración', 'Bandeja de Entrada',
    'Bandeja de Salida', 'Oficina de Partes', 'Búsqueda de Documentos'])
})
test('el botón oculta y muestra el menú', async () => {
  const boton = screen.getByRole('button', { name: 'Menú' })
  expect(boton).toHaveAttribute('aria-expanded', 'true')
  await user.click(boton)
  expect(boton).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument()
  await user.click(boton)
  expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
})
test('recuerda el menú oculto al volver a cargar', async () => {
  await user.click(screen.getByRole('button', { name: 'Menú' }))
  expect(localStorage.getItem('gd.menuVisible')).toBe('0')
  cleanup(); render(<App rutaInicial="/inicio" />)
  expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false')
})
test('navegar desde el menú muestra la sección y la marca como activa', async () => {
  await user.click(screen.getByRole('link', { name: 'Oficina de Partes' }))
  expect(screen.getByRole('heading', { name: 'Oficina de Partes' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Oficina de Partes' })).toHaveAttribute('aria-current', 'page')
})
test('en pantalla angosta el menú parte oculto y se cierra al navegar', async () => {
  ancho(600); localStorage.setItem('gd.menuVisible', '1'); /* render */
  const boton = screen.getByRole('button', { name: 'Menú' })
  expect(boton).toHaveAttribute('aria-expanded', 'false')
  await user.click(boton)
  await user.click(screen.getByRole('link', { name: 'Mi perfil' }))
  expect(boton).toHaveAttribute('aria-expanded', 'false')
})
test('si localStorage falla, el menú igual funciona', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error() })
  /* render */
  const boton = screen.getByRole('button', { name: 'Menú' })
  expect(boton).toHaveAttribute('aria-expanded', 'true')
  await user.click(boton)
  expect(boton).toHaveAttribute('aria-expanded', 'false')
})
test('la bienvenida saluda al usuario y ofrece las seis secciones', () => {
  expect(screen.getByRole('heading', { name: 'Bienvenido, Administrador' })).toBeInTheDocument()
  expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(6)
})
test('cerrar sesión vuelve al login y bloquea las vistas internas', async () => {
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  expect(sessionStorage.getItem('gd.sesion')).toBeNull()
})
```

Nota: como el fallo de `sessionStorage` también afectaría a la sesión en la prueba de `localStorage`, los espías deben limitarse a la clave `gd.menuVisible`.

- [ ] **Step 2: Verificar que fallan** — `npx vitest run src/estructura` → FAIL.
- [ ] **Step 3: Implementar** los tres componentes y los estilos: en 992 px o más el menú ocupa una columna fija que empuja el contenido; bajo 992 px se superpone al contenido con un fondo que al pulsarlo lo cierra.
- [ ] **Step 4: Verificar que pasan** — `npm test` → PASS; `npm run build` → sin errores.
- [ ] **Step 5: Commit** — `Agrega estructura con menú lateral ocultable y bienvenida`

---

### Task 6: Verificación en navegador y README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Recorrido real** con `npm run dev` y Playwright (Chromium preinstalado), en 1280×800 y en 390×844: login vacío, login con error, ingreso con `admin`/`admin123` pasando por el Turnstile real de prueba, bienvenida, menú visible y oculto, una sección, cerrar sesión, y acceso directo a `/perfil` sin sesión. Guardar capturas en el scratchpad y revisarlas.
- [ ] **Step 2: Corregir** lo que el recorrido muestre mal (contraste, desbordes, alineación del logo), con su prueba si es un defecto de comportamiento.
- [ ] **Step 3: Escribir el README**: qué es, requisitos (Node), `npm install`, `npm run dev`, `npm test`, `npm run build`, credenciales de demostración, variable `VITE_TURNSTILE_SITE_KEY`, y las dos advertencias de la spec: el login es simulado y el token del captcha no se verifica sin backend. Indicar que al publicar como sitio estático el servidor debe devolver `index.html` para cualquier ruta.
- [ ] **Step 4: Verificar** — `npm test` y `npm run build` → sin errores.
- [ ] **Step 5: Commit y push** — `Documenta el uso del proyecto`
