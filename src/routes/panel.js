'use strict';
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { MENU, menuFor } = require('../menu');

const DESCRIPTIONS = {
  administracion: 'Gestión de usuarios, roles y parámetros del sistema.',
  'bandeja-entrada': 'Documentos recibidos pendientes de revisión o tramitación.',
  'bandeja-salida': 'Documentos enviados y su estado de despacho.',
  'oficina-partes': 'Registro de ingreso y egreso de correspondencia oficial.',
  busqueda: 'Consulta de documentos por folio, materia, fecha o remitente.',
};

module.exports = function panelRoutes() {
  const router = express.Router();
  router.use(requireAuth);
  router.use((req, res, next) => {
    res.locals.menu = menuFor(req.user);
    res.locals.active = null;
    next();
  });

  router.get('/', (req, res) => {
    res.locals.active = 'inicio';
    res.render('panel/bienvenida', { title: 'Bienvenida' });
  });

  router.get('/perfil', (req, res) => {
    res.locals.active = 'perfil';
    res.render('panel/perfil', { title: 'Mi perfil' });
  });

  for (const item of MENU.filter((i) => i.slug !== 'perfil')) {
    const guards = item.roles.map((role) => requireRole(role));
    router.get(`/${item.slug}`, ...guards, (req, res) => {
      res.locals.active = item.slug;
      res.render('panel/seccion', { title: item.label, description: DESCRIPTIONS[item.slug] || '' });
    });
  }

  return router;
};
