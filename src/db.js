'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./security/password');

function openDatabase(config) {
  if (config.dbPath !== ':memory:') fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new DatabaseSync(config.dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      full_name     TEXT NOT NULL,
      email         TEXT,
      role          TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
      password_hash TEXT NOT NULL,
      active        INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      folio           TEXT NOT NULL UNIQUE,
      tipo            TEXT NOT NULL CHECK (tipo IN ('memo', 'oficio', 'resolucion', 'circular', 'carta', 'otro')),
      materia         TEXT NOT NULL,
      descripcion     TEXT,
      remitente       TEXT NOT NULL,
      origen          TEXT NOT NULL CHECK (origen IN ('interno', 'oficina_partes')),
      fecha_documento TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cada fila es un documento en la bandeja de entrada de un destinatario.
    -- accion: qué se le pide (conocimiento, visar o firmar); estado: si ya lo hizo.
    CREATE TABLE IF NOT EXISTS bandeja_entrada (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      documento_id    INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
      destinatario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      accion          TEXT NOT NULL DEFAULT 'conocimiento' CHECK (accion IN ('conocimiento', 'visar', 'firmar')),
      estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado')),
      leido           INTEGER NOT NULL DEFAULT 0,
      archivado       INTEGER NOT NULL DEFAULT 0,
      recibido_at     TEXT NOT NULL DEFAULT (datetime('now')),
      completado_at   TEXT,
      archivado_at    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bandeja_destinatario
      ON bandeja_entrada (destinatario_id, archivado, accion, estado);
  `);
  db.exec('PRAGMA foreign_keys = ON');
  seedAdmin(db, config);
  return db;
}

function seedAdmin(db, config) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;
  let password = config.adminPassword;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    console.log('──────────────────────────────────────────────');
    console.log(' Usuario administrador inicial creado');
    console.log(`   usuario:    ${config.adminUser}`);
    console.log(`   contraseña: ${password}`);
    console.log(' Guárdela: no se volverá a mostrar.');
    console.log('──────────────────────────────────────────────');
  }
  db.prepare('INSERT INTO users (username, full_name, role, password_hash) VALUES (?, ?, ?, ?)').run(
    config.adminUser,
    'Administrador',
    'admin',
    hashPassword(password)
  );
}

function createUserRepo(db) {
  return {
    findByUsername: (username) =>
      db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username),
    findById: (id) =>
      db
        .prepare('SELECT id, username, full_name, email, role, last_login_at, created_at FROM users WHERE id = ? AND active = 1')
        .get(id),
    touchLogin: (id) => db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(id),
  };
}

module.exports = { openDatabase, createUserRepo };
