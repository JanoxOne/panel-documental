# Gestor Documental — base de frontend (login, bienvenida y menú lateral)

Fecha: 2026-11-10
Estado: pendiente de revisión

## Objetivo

Iniciar el proyecto web "Gestor Documental" del Servicio de Salud Osorno con
una base de frontend navegable: login, vista de bienvenida y estructura con
menú lateral ocultable. Sirve para validar la interfaz antes de elegir el
backend.

## Alcance

Incluye:

- Login con usuario y contraseña en la raíz del sitio, con captcha oculto.
- Vista de bienvenida para el administrador autenticado.
- Menú lateral ocultable con seis secciones.
- UI con el Kit Digital del Gobierno de Chile y el logo del Servicio de Salud
  Osorno.

No incluye (etapas posteriores):

- Backend, base de datos y autenticación real.
- Verificación del token del captcha en servidor.
- Funcionalidad de las seis secciones (son páginas vacías con título).
- Roles distintos de administrador, recuperación de contraseña, registro.

## Stack

- Vite + React + TypeScript, con React Router.
- Kit Digital: paquete npm `@gobdigital-cl/gob.cl` 3.0.10. Se usa solo su hoja
  de estilos compilada (`dist/css/gob.cl.css`) y sus tipografías e íconos. Su
  JavaScript depende de jQuery y Bootstrap 4 y no se carga: el comportamiento
  (menú, alertas, validación) lo implementa React.
- Captcha: Cloudflare Turnstile en modo invisible.
- Pruebas: Vitest + Testing Library.

## Rutas

| Ruta               | Vista                   | Requiere sesión |
|--------------------|-------------------------|-----------------|
| `/`                | Login                   | No              |
| `/inicio`          | Bienvenida              | Sí              |
| `/perfil`          | Mi perfil               | Sí              |
| `/administracion`  | Administración          | Sí              |
| `/bandeja-entrada` | Bandeja de Entrada      | Sí              |
| `/bandeja-salida`  | Bandeja de Salida       | Sí              |
| `/oficina-partes`  | Oficina de Partes       | Sí              |
| `/busqueda`        | Búsqueda de Documentos  | Sí              |

- `/` con sesión activa redirige a `/inicio`.
- Una ruta protegida sin sesión redirige a `/`.
- Una ruta desconocida redirige a `/`.

## Componentes

Cada unidad tiene un propósito único y se puede probar por separado.

- `auth` (módulo, sin UI): `iniciarSesion(usuario, contrasena, tokenCaptcha)`,
  `cerrarSesion()`, `obtenerSesion()`. Es el único punto que cambia al conectar
  un backend.
- `ProveedorSesion` (contexto React): expone la sesión actual y las acciones de
  `auth` a los componentes.
- `RutaProtegida`: deja pasar si hay sesión; si no, redirige a `/`.
- `CaptchaOculto`: carga el script de Turnstile, crea el widget invisible y
  expone `ejecutar(): Promise<string>` que devuelve el token.
- `PaginaLogin`: formulario, validación y mensajes de error.
- `EstructuraApp`: encabezado, menú lateral y área de contenido de las rutas
  protegidas.
- `MenuLateral`: lista de secciones definida en un único arreglo (etiqueta,
  ruta, ícono).
- `PaginaBienvenida` y `PaginaSeccion` (página vacía reutilizable con título).

## Login simulado

- Credenciales de demostración: usuario `admin`, contraseña `admin123`,
  definidas en el módulo `auth`.
- La sesión (usuario, nombre visible, rol `admin`) se guarda en
  `sessionStorage`: sobrevive a recargar la página y termina al cerrar la
  pestaña.
- Esto no es seguridad real: las credenciales viajan en el código del
  navegador. La pantalla de login muestra un aviso "Ambiente de demostración"
  con las credenciales, y el aviso se elimina al conectar el backend.

## Captcha oculto

- Turnstile invisible con la clave pública de prueba de Cloudflare
  `1x00000000000000000000BB` (siempre aprueba, sin interacción).
- La clave se lee de la variable `VITE_TURNSTILE_SITE_KEY`; si no está
  definida se usa la de prueba.
- Al enviar el formulario se ejecuta el captcha, y `auth.iniciarSesion` rechaza
  el intento si no recibe un token.
- Limitación: sin backend el token no se verifica contra Cloudflare, así que
  en esta etapa el captcha demuestra el flujo pero no protege.

## Estructura con sesión

- Encabezado: botón para ocultar o mostrar el menú, logo del Servicio de Salud
  Osorno, nombre "Gestor Documental", nombre del usuario y "Cerrar sesión".
- Menú lateral, en este orden: Mi perfil, Administración, Bandeja de Entrada,
  Bandeja de Salida, Oficina de Partes, Búsqueda de Documentos. La sección
  activa se destaca.
- En escritorio el menú empuja el contenido y su estado (visible u oculto) se
  recuerda en `localStorage`.
- En pantallas angostas (menos de 992 px) el menú parte oculto, se abre sobre
  el contenido y se cierra al elegir una sección.
- El botón del menú informa su estado con `aria-expanded` y es operable con
  teclado.
- Bienvenida: saludo con el nombre del usuario y accesos directos a las seis
  secciones.

## Logo

- Archivo entregado por el usuario (JPEG 1536×1392), guardado en
  `src/assets/logo-ss-osorno.jpg`.
- Se usa en el login y en el encabezado, con texto alternativo
  "Servicio de Salud Osorno".

## Errores

| Caso                              | Comportamiento                                              |
|-----------------------------------|-------------------------------------------------------------|
| Usuario o contraseña vacíos       | Mensaje junto al campo; no se ejecuta el captcha.           |
| Credenciales incorrectas          | Alerta "Usuario o contraseña incorrectos"; se limpia la contraseña. |
| Captcha falla o no carga          | Alerta "No se pudo verificar el captcha. Intente nuevamente"; no se inicia sesión. |
| Envío en curso                    | Botón deshabilitado para evitar doble envío.                |

## Pruebas

Automáticas (Vitest + Testing Library; el captcha se sustituye por un doble de
prueba):

- `auth`: credenciales correctas, incorrectas y token ausente; persistencia y
  cierre de sesión.
- Login: validación de campos vacíos, error de credenciales, error de captcha,
  redirección a `/inicio` al ingresar.
- Rutas: protegida sin sesión redirige a `/`; `/` con sesión redirige a
  `/inicio`.
- Menú: muestra las seis secciones en orden, se oculta y se muestra, recuerda
  su estado.

Manual: recorrido en navegador (escritorio y móvil) con capturas del login, la
bienvenida y el menú abierto y oculto, incluido el captcha real de prueba.

## Criterios de éxito

- Abrir el sitio muestra el login.
- Con `admin` / `admin123` se llega a la bienvenida; con otros datos, no.
- El menú lateral muestra las seis secciones, navega a cada una y se puede
  ocultar y mostrar.
- Sin sesión no se puede ver ninguna vista interna.
- `npm run build` y `npm test` terminan sin errores.
