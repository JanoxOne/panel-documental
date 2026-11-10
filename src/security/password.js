'use strict';
const crypto = require('node:crypto');

const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN, PARAMS);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, PARAMS);
  return crypto.timingSafeEqual(expected, actual);
}

// Hash ficticio para igualar tiempos de respuesta cuando el usuario no existe.
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

module.exports = { hashPassword, verifyPassword, DUMMY_HASH };
