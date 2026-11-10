'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, loginFields, login } = require('./helpers');
const { hashPassword } = require('../src/security/password');
const { CARPETAS } = require('../src/bandeja');

let server;
let base;
let bandeja;
let adminId;
let otroId;
const ids = {};

before(async () => {
  let app;
  ({ app, server, base } = await startServer());
  const { db } = app.locals;
  bandeja = app.locals.repos.bandeja;
  adminId = db.prepare("SELECT id FROM users WHERE username = 'admin'").get().id;
  otroId = Number(
    db
      .prepare('INSERT INTO users (username, full_name, password_hash) VALUES (?, ?, ?)')
      .run('otro', 'Otra Persona', hashPassword('Otra#2026')).lastInsertRowid
  );
  const doc = (folio, tipo, origen, materia) => ({
    folio, tipo, origen, materia, remitente: 'Gabinete', fecha_documento: '2026-11-01',
  });
  [ids.memo] = bandeja.recibir(doc('M-1', 'memo', 'interno', 'Memo de prueba'), [{ userId: adminId }]);
  [ids.op] = bandeja.recibir(doc('OP-1', 'oficio', 'oficina_partes', 'Oficio externo'), [{ userId: adminId }]);
  [ids.visar] = bandeja.recibir(doc('R-1', 'resolucion', 'interno', 'Resolución para visar'), [{ userId: adminId, accion: 'visar' }]);
  [ids.firmar] = bandeja.recibir(doc('R-2', 'resolucion', 'interno', 'Resolución para firmar'), [{ userId: adminId, accion: 'firmar' }]);
  [ids.ajeno] = bandeja.recibir(doc('X-1', 'memo', 'interno', 'Memo ajeno'), [{ userId: otroId }]);
});

after(() => server.close());

async function adminClient() {
  const req = client(base);
  await login(req);
  return req;
}

/** Envía una acción POST desde la página de detalle (usa su token CSRF). */
async function accion(req, id, nombre) {
  const page = await req(`/panel/bandeja-entrada/doc/${id}`);
  return req(`/panel/bandeja-entrada/doc/${id}/${nombre}`, { method: 'POST', form: { _csrf: loginFields(page.text).csrf } });
}

test('el menú de la bandeja muestra las 7 carpetas', async () => {
  const req = await adminClient();
  const res = await req('/panel/bandeja-entrada/memo');
  assert.equal(res.status, 200);
  for (const label of ['Memo', 'Oficina de Partes', 'Documentos por Visar', 'Documentos por Firmar', 'Documentos Firmados', 'Documentos Visados', 'Archivados']) {
    assert.ok(res.text.includes(label), `falta carpeta: ${label}`);
  }
  assert.equal(CARPETAS.length, 7);
});

test('cada documento aparece en su carpeta', async () => {
  const req = await adminClient();
  const en = async (slug) => (await req(`/panel/bandeja-entrada/${slug}`)).text;
  assert.match(await en('memo'), /Memo de prueba/);
  assert.doesNotMatch(await en('memo'), /Oficio externo/);
  assert.match(await en('oficina-partes'), /Oficio externo/);
  assert.match(await en('por-visar'), /Resolución para visar/);
  assert.match(await en('por-firmar'), /Resolución para firmar/);
  assert.doesNotMatch(await en('memo'), /Memo ajeno/, 'no debe ver documentos de otra persona');
});

test('carpeta inexistente da 404', async () => {
  const req = await adminClient();
  assert.equal((await req('/panel/bandeja-entrada/no-existe')).status, 404);
});

test('abrir un documento lo marca como leído', async () => {
  const req = await adminClient();
  assert.equal(bandeja.obtener(adminId, ids.op).leido, 0);
  const res = await req(`/panel/bandeja-entrada/doc/${ids.op}`);
  assert.equal(res.status, 200);
  assert.match(res.text, /Oficio externo/);
  assert.equal(bandeja.obtener(adminId, ids.op).leido, 1);
});

test('no se puede ver ni modificar un documento de otra persona', async () => {
  const req = await adminClient();
  assert.equal((await req(`/panel/bandeja-entrada/doc/${ids.ajeno}`)).status, 404);
  const page = await req('/panel/bandeja-entrada/memo');
  const res = await req(`/panel/bandeja-entrada/doc/${ids.ajeno}/archivar`, {
    method: 'POST',
    form: { _csrf: loginFields(page.text).csrf },
  });
  assert.equal(res.status, 404);
  assert.equal(bandeja.obtener(otroId, ids.ajeno).archivado, 0);
});

test('visar mueve el documento de "por visar" a "visados"', async () => {
  const req = await adminClient();
  const res = await accion(req, ids.visar, 'visar');
  assert.equal(res.status, 302);
  assert.match((await req(res.location)).text, /Documento visado/);
  assert.doesNotMatch((await req('/panel/bandeja-entrada/por-visar')).text, /Resolución para visar/);
  assert.match((await req('/panel/bandeja-entrada/visados')).text, /Resolución para visar/);
});

test('firmar mueve el documento a "firmados" y no se puede firmar dos veces', async () => {
  const req = await adminClient();
  await accion(req, ids.firmar, 'firmar');
  assert.match((await req('/panel/bandeja-entrada/firmados')).text, /Resolución para firmar/);
  const again = await accion(req, ids.firmar, 'firmar');
  assert.match((await req(again.location)).text, /no está pendiente de firma/);
});

test('no se puede visar un documento que sólo es para conocimiento', async () => {
  const req = await adminClient();
  const res = await accion(req, ids.memo, 'visar');
  assert.match((await req(res.location)).text, /no está pendiente de visación/);
  assert.equal(bandeja.obtener(adminId, ids.memo).estado, 'pendiente');
});

test('archivar y restaurar', async () => {
  const req = await adminClient();
  await accion(req, ids.memo, 'archivar');
  assert.doesNotMatch((await req('/panel/bandeja-entrada/memo')).text, /Memo de prueba/);
  assert.match((await req('/panel/bandeja-entrada/archivados')).text, /Memo de prueba/);
  await accion(req, ids.memo, 'restaurar');
  assert.match((await req('/panel/bandeja-entrada/memo')).text, /Memo de prueba/);
});

test('la búsqueda filtra por materia, folio o remitente y escapa comodines', async () => {
  const req = await adminClient();
  assert.match((await req('/panel/bandeja-entrada/memo?q=prueba')).text, /Memo de prueba/);
  assert.match((await req('/panel/bandeja-entrada/memo?q=M-1')).text, /Memo de prueba/);
  assert.doesNotMatch((await req('/panel/bandeja-entrada/memo?q=zzz')).text, /Memo de prueba/);
  assert.doesNotMatch((await req('/panel/bandeja-entrada/memo?q=%25')).text, /Memo de prueba/);
});

test('las acciones exigen token CSRF', async () => {
  const req = await adminClient();
  const res = await req(`/panel/bandeja-entrada/doc/${ids.memo}/archivar`, { method: 'POST', form: {} });
  assert.equal(res.status, 403);
});
