'use strict';
/**
 * Carga documentos de ejemplo en la Bandeja de Entrada de un usuario (por defecto, el admin).
 * Uso: npm run seed:demo [-- usuario]
 * Sólo para desarrollo/demostración: no se ejecuta si ya existen documentos.
 */
const { loadConfig } = require('../src/config');
const { openDatabase, createUserRepo } = require('../src/db');
const { createBandejaRepo } = require('../src/bandeja');

const config = loadConfig();
const db = openDatabase(config);
const username = process.argv[2] || config.adminUser;
const user = createUserRepo(db).findByUsername(username);
if (!user) {
  console.error(`No existe el usuario "${username}".`);
  process.exit(1);
}
const { n } = db.prepare('SELECT COUNT(*) AS n FROM documentos').get();
if (n > 0) {
  console.log(`Ya hay ${n} documentos; no se cargan ejemplos.`);
  process.exit(0);
}

const bandeja = createBandejaRepo(db);
const hace = (dias, horas = 9) => {
  const d = new Date(Date.now() - dias * 86400000);
  d.setUTCHours(horas, (dias * 7) % 60, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};
const fecha = (dias) => hace(dias).slice(0, 10);

const EJEMPLOS = [
  ['MEMO-2026-0412', 'memo', 'interno', 'Calendario de vacaciones del segundo semestre', 'Recursos Humanos', 'conocimiento', 0],
  ['MEMO-2026-0409', 'memo', 'interno', 'Actualización del procedimiento de compras menores', 'Dirección de Administración y Finanzas', 'conocimiento', 1],
  ['MEMO-2026-0398', 'memo', 'interno', 'Convocatoria a reunión de coordinación mensual', 'Gabinete', 'conocimiento', 3],
  ['MEMO-2026-0377', 'memo', 'interno', 'Cierre de inventario anual de bienes', 'Unidad de Inventario', 'conocimiento', 9],
  ['OP-2026-1187', 'oficio', 'oficina_partes', 'Solicitud de información sobre proyecto de pavimentación', 'Contraloría Regional', 'conocimiento', 0],
  ['OP-2026-1179', 'carta', 'oficina_partes', 'Reclamo por demora en respuesta a solicitud', 'Juan Pérez Soto', 'conocimiento', 2],
  ['OP-2026-1160', 'oficio', 'oficina_partes', 'Remite informe técnico de fiscalización', 'Superintendencia de Medio Ambiente', 'conocimiento', 5],
  ['RES-2026-0221', 'resolucion', 'interno', 'Aprueba bases de licitación de servicio de aseo', 'Departamento Jurídico', 'visar', 0],
  ['RES-2026-0219', 'resolucion', 'interno', 'Aprueba convenio de colaboración con universidad', 'Departamento Jurídico', 'visar', 1],
  ['OF-2026-0533', 'oficio', 'interno', 'Respuesta a requerimiento de Contraloría', 'Dirección de Obras', 'visar', 4],
  ['RES-2026-0225', 'resolucion', 'interno', 'Designa comisión evaluadora de licitación', 'Secretaría General', 'firmar', 0],
  ['OF-2026-0540', 'oficio', 'interno', 'Solicita disponibilidad presupuestaria', 'Dirección de Administración y Finanzas', 'firmar', 1],
  ['CIR-2026-0031', 'circular', 'interno', 'Instruye uso obligatorio de firma electrónica', 'Gabinete', 'firmar', 2],
  ['RES-2026-0190', 'resolucion', 'interno', 'Aprueba contrato de arriendo de bodega', 'Departamento Jurídico', 'firmar', 12, 'completado'],
  ['OF-2026-0488', 'oficio', 'interno', 'Remite antecedentes a Fiscalía', 'Dirección de Control', 'firmar', 15, 'completado'],
  ['RES-2026-0185', 'resolucion', 'interno', 'Aprueba pago de horas extraordinarias', 'Recursos Humanos', 'visar', 11, 'completado'],
  ['OF-2026-0470', 'oficio', 'interno', 'Informa estado de avance de obras', 'Dirección de Obras', 'visar', 18, 'completado'],
  ['MEMO-2026-0301', 'memo', 'interno', 'Cambio de horario de atención de público', 'Gabinete', 'conocimiento', 30, 'pendiente', true],
  ['OP-2026-0950', 'oficio', 'oficina_partes', 'Acusa recibo de documentación', 'Ministerio de Vivienda', 'conocimiento', 40, 'pendiente', true],
];

for (const [folio, tipo, origen, materia, remitente, accion, dias, estado = 'pendiente', archivar = false] of EJEMPLOS) {
  const [id] = bandeja.recibir(
    {
      folio, tipo, origen, materia, remitente,
      descripcion: `${materia}.\n\nDocumento de ejemplo cargado para demostración del Panel Documental.`,
      fecha_documento: fecha(dias + 1),
    },
    [{ userId: user.id, accion, recibidoAt: hace(dias, 8 + (folio.length % 9)) }]
  );
  if (dias > 2) bandeja.marcarLeido(user.id, id);
  if (estado === 'completado') bandeja.completar(user.id, id, accion);
  if (archivar) bandeja.archivar(user.id, id, true);
}
console.log(`Cargados ${EJEMPLOS.length} documentos de ejemplo en la bandeja de "${user.username}".`);
