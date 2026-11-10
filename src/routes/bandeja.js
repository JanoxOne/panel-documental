'use strict';
const express = require('express');
const { CARPETAS, CARPETA_POR_SLUG, TIPOS, carpetaDe, insignia } = require('../bandeja');

const ACCIONES = {
  visar: { ok: 'Documento visado.', error: 'Este documento no está pendiente de visación.' },
  firmar: { ok: 'Documento firmado.', error: 'Este documento no está pendiente de firma.' },
};

function parseId(raw) {
  return /^\d{1,10}$/.test(raw) ? Number(raw) : null;
}

module.exports = function bandejaRoutes({ bandeja }) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.locals.active = 'bandeja-entrada';
    res.locals.carpetas = CARPETAS;
    res.locals.tipos = TIPOS;
    res.locals.insignia = insignia;
    res.locals.conteos = bandeja.contar(req.user.id);
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
  });

  router.get('/', (req, res) => res.redirect('/panel/bandeja-entrada/memo'));

  router.get('/doc/:id', (req, res, next) => {
    const id = parseId(req.params.id);
    const entrada = id && bandeja.obtener(req.user.id, id);
    if (!entrada) return next(); // 404
    if (!entrada.leido) {
      bandeja.marcarLeido(req.user.id, id);
      res.locals.conteos = bandeja.contar(req.user.id);
    }
    const carpeta = CARPETA_POR_SLUG[carpetaDe(entrada)];
    res.locals.carpetaActual = carpeta.slug;
    res.render('panel/bandeja/detalle', { title: entrada.folio, entrada, carpeta });
  });

  router.get('/:carpeta', (req, res, next) => {
    const carpeta = CARPETA_POR_SLUG[req.params.carpeta];
    if (!carpeta) return next();
    const q = String(req.query.q || '').trim().slice(0, 100);
    const page = parseId(String(req.query.page || '1')) || 1;
    const resultado = bandeja.listar(req.user.id, carpeta.slug, { q, page });
    res.locals.carpetaActual = carpeta.slug;
    res.render('panel/bandeja/lista', { title: 'Bandeja de Entrada', carpeta, q, resultado });
  });

  function volver(req, res, id, mensaje, tipo = 'ok') {
    req.session.flash = { tipo, mensaje };
    res.redirect(`/panel/bandeja-entrada/doc/${id}`);
  }

  for (const accion of Object.keys(ACCIONES)) {
    router.post(`/doc/:id/${accion}`, (req, res, next) => {
      const id = parseId(req.params.id);
      if (!id || !bandeja.obtener(req.user.id, id)) return next();
      const ok = bandeja.completar(req.user.id, id, accion);
      volver(req, res, id, ok ? ACCIONES[accion].ok : ACCIONES[accion].error, ok ? 'ok' : 'error');
    });
  }

  router.post('/doc/:id/archivar', (req, res, next) => {
    const id = parseId(req.params.id);
    if (!id || !bandeja.obtener(req.user.id, id)) return next();
    const ok = bandeja.archivar(req.user.id, id, true);
    volver(req, res, id, ok ? 'Documento archivado.' : 'El documento ya estaba archivado.', ok ? 'ok' : 'error');
  });

  router.post('/doc/:id/restaurar', (req, res, next) => {
    const id = parseId(req.params.id);
    if (!id || !bandeja.obtener(req.user.id, id)) return next();
    const ok = bandeja.archivar(req.user.id, id, false);
    volver(req, res, id, ok ? 'Documento restaurado a la bandeja.' : 'El documento no estaba archivado.', ok ? 'ok' : 'error');
  });

  return router;
};
