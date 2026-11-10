'use strict';
const crypto = require('node:crypto');

function loadUser(users) {
  return (req, res, next) => {
    res.locals.currentUser = null;
    if (req.session.userId) {
      const user = users.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      } else {
        delete req.session.userId;
      }
    }
    next();
  };
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.redirect('/login');
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) return next();
    return res.status(403).render('error', {
      title: 'Acceso denegado',
      message: 'No tiene permisos para ver esta sección.',
    });
  };
}

/** Token CSRF por sesión (patrón synchronizer token). */
function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (req.method === 'POST') {
    const sent = Buffer.from(String((req.body && req.body._csrf) || ''));
    const expected = Buffer.from(req.session.csrfToken);
    if (sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
      return res.status(403).render('error', {
        title: 'Solicitud inválida',
        message: 'El formulario expiró. Recargue la página e intente de nuevo.',
      });
    }
  }
  next();
}

module.exports = { loadUser, requireAuth, requireRole, csrf };
