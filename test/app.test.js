'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const browserSha256 = require('../public/js/sha256');
const { startServer, client: makeClient, loginFields, login } = require('./helpers');
const { solveChallenge } = require('../src/security/captcha');

let server;
let base;
const client = () => makeClient(base);

before(async () => {
  ({ server, base } = await startServer());
});

after(() => server.close());

test('la página principal redirige al login', async () => {
  const res = await client()('/');
  assert.equal(res.status, 302);
  assert.equal(res.location, '/login');
});

test('el login muestra usuario, contraseña y el captcha oculto', async () => {
  const res = await client()('/login');
  assert.equal(res.status, 200);
  assert.match(res.text, /name="username"/);
  assert.match(res.text, /name="password"/);
  assert.match(res.text, /class="hp"/);
  assert.match(res.text, /data-challenge="[0-9a-f]{32}"/);
});

test('el panel exige sesión', async () => {
  const res = await client()('/panel');
  assert.equal(res.status, 302);
  assert.equal(res.location, '/login');
});

test('login correcto muestra la bienvenida y el menú lateral completo para admin', async () => {
  const req = client();
  const res = await login(req);
  assert.equal(res.status, 302);
  assert.equal(res.location, '/panel');
  const panel = await req('/panel');
  assert.equal(panel.status, 200);
  assert.match(panel.text, /Bienvenido\/a, Administrador/);
  for (const label of ['Mi perfil', 'Administración', 'Bandeja de Entrada', 'Bandeja de Salida', 'Oficina de Partes', 'Búsqueda de Documentos']) {
    assert.ok(panel.text.includes(label), `falta opción de menú: ${label}`);
  }
  assert.match(panel.text, /id="menu-toggle"/);
  for (const slug of ['perfil', 'administracion', 'bandeja-entrada/memo', 'bandeja-salida', 'oficina-partes', 'busqueda']) {
    assert.equal((await req(`/panel/${slug}`)).status, 200, slug);
  }
  assert.equal((await req('/panel/bandeja-entrada')).location, '/panel/bandeja-entrada/memo');
});

test('contraseña incorrecta es rechazada con mensaje genérico', async () => {
  const res = await login(client(), { username: 'otro', password: 'mala' });
  assert.equal(res.status, 401);
  assert.match(res.text, /Usuario o contraseña incorrectos/);
});

test('el captcha rechaza honeypot relleno, prueba de trabajo inválida y desafíos reutilizados', async () => {
  const bot = await login(client(), { extra: { website: 'http://spam.example' } });
  assert.equal(bot.status, 400);

  const noWork = await login(client(), { solve: false });
  // '0' podría ser válido por azar; sólo lo comprobamos si no lo es.
  if (noWork.status !== 302) assert.equal(noWork.status, 400);

  const req = client();
  const page = await req('/login');
  const f = loginFields(page.text);
  const form = {
    _csrf: f.csrf,
    captcha_challenge: f.challenge,
    captcha_nonce: solveChallenge(f.challenge, f.difficulty),
    username: 'nadie',
    password: 'x',
  };
  assert.equal((await req('/login', { method: 'POST', form })).status, 401);
  assert.equal((await req('/login', { method: 'POST', form })).status, 400, 'reutilizar el desafío debe fallar');
});

test('POST sin token CSRF es rechazado', async () => {
  const req = client();
  await req('/login');
  const res = await req('/login', { method: 'POST', form: { username: 'admin', password: 'x' } });
  assert.equal(res.status, 403);
});

test('tras varios fallos el usuario queda bloqueado temporalmente', async () => {
  for (let i = 0; i < 3; i++) await login(client(), { username: 'bloqueo', password: 'mala' });
  const res = await login(client(), { username: 'bloqueo', password: 'mala' });
  assert.equal(res.status, 429);
});

test('cerrar sesión invalida el acceso al panel', async () => {
  const req = client();
  await login(req, { username: 'ADMIN' }); // usuario sin distinción de mayúsculas
  const panel = await req('/panel');
  const csrf = loginFields(panel.text).csrf;
  const out = await req('/logout', { method: 'POST', form: { _csrf: csrf } });
  assert.equal(out.location, '/login');
  assert.equal((await req('/panel')).status, 302);
});

test('el SHA-256 del navegador coincide con el de Node', () => {
  for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(64), `${'f'.repeat(32)}:123456`]) {
    assert.equal(browserSha256(s), crypto.createHash('sha256').update(s).digest('hex'));
  }
});
