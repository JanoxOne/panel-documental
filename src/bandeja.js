'use strict';
/**
 * Bandeja de Entrada: carpetas y acceso a datos.
 *
 * Toda entrada no archivada cae en exactamente una carpeta:
 *  - accion "conocimiento" → Memo (origen interno) u Oficina de Partes (origen externo)
 *  - accion "visar"/"firmar" → por visar/firmar (pendiente) o visados/firmados (completado)
 * Las archivadas sólo aparecen en "Archivados".
 */
const CARPETAS = [
  { slug: 'memo', label: 'Memo', badge: 'sinLeer', where: "e.archivado = 0 AND e.accion = 'conocimiento' AND d.origen = 'interno'" },
  { slug: 'oficina-partes', label: 'Oficina de Partes', badge: 'sinLeer', where: "e.archivado = 0 AND e.accion = 'conocimiento' AND d.origen = 'oficina_partes'" },
  { slug: 'por-visar', label: 'Documentos por Visar', badge: 'pendientes', where: "e.archivado = 0 AND e.accion = 'visar' AND e.estado = 'pendiente'" },
  { slug: 'por-firmar', label: 'Documentos por Firmar', badge: 'pendientes', where: "e.archivado = 0 AND e.accion = 'firmar' AND e.estado = 'pendiente'" },
  { slug: 'firmados', label: 'Documentos Firmados', badge: 'total', where: "e.archivado = 0 AND e.accion = 'firmar' AND e.estado = 'completado'" },
  { slug: 'visados', label: 'Documentos Visados', badge: 'total', where: "e.archivado = 0 AND e.accion = 'visar' AND e.estado = 'completado'" },
  { slug: 'archivados', label: 'Archivados', badge: 'total', where: 'e.archivado = 1' },
];
/**
 * Contador a mostrar junto a cada carpeta: en las de conocimiento, los no leídos;
 * en las de trámite, los pendientes (ambos destacados); en el resto, el total (neutro).
 */
function insignia(carpeta, conteo) {
  if (carpeta.badge === 'sinLeer') return { n: conteo.sinLeer, destacada: true, titulo: 'sin leer' };
  if (carpeta.badge === 'pendientes') return { n: conteo.total, destacada: true, titulo: 'pendientes' };
  return { n: conteo.total, destacada: false, titulo: 'documentos' };
}

const CARPETA_POR_SLUG = Object.fromEntries(CARPETAS.map((c) => [c.slug, c]));

const TIPOS = {
  memo: 'Memo',
  oficio: 'Oficio',
  resolucion: 'Resolución',
  circular: 'Circular',
  carta: 'Carta',
  otro: 'Otro',
};

/** Carpeta (no archivada) en la que está una entrada. */
function carpetaDe(entrada) {
  if (entrada.archivado) return 'archivados';
  if (entrada.accion === 'conocimiento') return entrada.origen === 'interno' ? 'memo' : 'oficina-partes';
  const pendiente = entrada.estado === 'pendiente';
  if (entrada.accion === 'visar') return pendiente ? 'por-visar' : 'visados';
  return pendiente ? 'por-firmar' : 'firmados';
}

const BASE = `
  FROM bandeja_entrada e
  JOIN documentos d ON d.id = e.documento_id
  WHERE e.destinatario_id = ?`;

const COLUMNAS = `
  e.id, e.accion, e.estado, e.leido, e.archivado, e.recibido_at, e.completado_at, e.archivado_at,
  d.folio, d.tipo, d.materia, d.descripcion, d.remitente, d.origen, d.fecha_documento`;

function escapeLike(s) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function createBandejaRepo(db) {
  return {
    /** { slug: { total, sinLeer } } para el usuario. */
    contar(userId) {
      const out = {};
      for (const c of CARPETAS) {
        const row = db
          .prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(e.leido = 0), 0) AS sinLeer ${BASE} AND ${c.where}`)
          .get(userId);
        out[c.slug] = { total: row.total, sinLeer: row.sinLeer };
      }
      return out;
    },

    listar(userId, slug, { q = '', page = 1, pageSize = 20 } = {}) {
      const carpeta = CARPETA_POR_SLUG[slug];
      if (!carpeta) throw new Error(`Carpeta desconocida: ${slug}`);
      let filtro = '';
      const params = [userId];
      if (q) {
        const like = `%${escapeLike(q)}%`;
        filtro = " AND (d.folio LIKE ? ESCAPE '\\' OR d.materia LIKE ? ESCAPE '\\' OR d.remitente LIKE ? ESCAPE '\\')";
        params.push(like, like, like);
      }
      const { total } = db.prepare(`SELECT COUNT(*) AS total ${BASE} AND ${carpeta.where}${filtro}`).get(...params);
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const current = Math.min(Math.max(1, page), pages);
      const rows = db
        .prepare(
          `SELECT ${COLUMNAS} ${BASE} AND ${carpeta.where}${filtro}
           ORDER BY e.recibido_at DESC, e.id DESC LIMIT ? OFFSET ?`
        )
        .all(...params, pageSize, (current - 1) * pageSize);
      return { rows, total, page: current, pages };
    },

    /** Entrada del usuario (null si no existe o es de otra persona). */
    obtener(userId, id) {
      return db.prepare(`SELECT ${COLUMNAS} ${BASE} AND e.id = ?`).get(userId, id) || null;
    },

    marcarLeido(userId, id) {
      db.prepare('UPDATE bandeja_entrada SET leido = 1 WHERE id = ? AND destinatario_id = ?').run(id, userId);
    },

    /** Marca como visado/firmado. Devuelve true si la transición era válida. */
    completar(userId, id, accion) {
      const r = db
        .prepare(
          `UPDATE bandeja_entrada SET estado = 'completado', completado_at = datetime('now'), leido = 1
           WHERE id = ? AND destinatario_id = ? AND accion = ? AND estado = 'pendiente' AND archivado = 0`
        )
        .run(id, userId, accion);
      return r.changes === 1;
    },

    archivar(userId, id, archivado) {
      const r = db
        .prepare(
          `UPDATE bandeja_entrada
           SET archivado = ?, archivado_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
           WHERE id = ? AND destinatario_id = ? AND archivado = ?`
        )
        .run(archivado ? 1 : 0, archivado ? 1 : 0, id, userId, archivado ? 0 : 1);
      return r.changes === 1;
    },

    /** Crea un documento y lo deja en la bandeja de cada destinatario. */
    recibir(doc, destinatarios) {
      const insDoc = db.prepare(
        `INSERT INTO documentos (folio, tipo, materia, descripcion, remitente, origen, fecha_documento)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      const insEntrada = db.prepare(
        `INSERT INTO bandeja_entrada (documento_id, destinatario_id, accion, recibido_at)
         VALUES (?, ?, ?, COALESCE(?, datetime('now')))`
      );
      db.exec('BEGIN');
      try {
        const { lastInsertRowid } = insDoc.run(
          doc.folio, doc.tipo, doc.materia, doc.descripcion || null, doc.remitente, doc.origen, doc.fecha_documento
        );
        const ids = destinatarios.map(
          (d) => insEntrada.run(lastInsertRowid, d.userId, d.accion || 'conocimiento', d.recibidoAt || null).lastInsertRowid
        );
        db.exec('COMMIT');
        return ids.map(Number);
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

module.exports = { insignia, CARPETAS, CARPETA_POR_SLUG, TIPOS, carpetaDe, createBandejaRepo };
