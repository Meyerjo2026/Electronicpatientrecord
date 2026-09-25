#!/usr/bin/env node
/**
 * Generate the quality indicator dataset from the DEMS ePCR module documents.
 *
 * The `Quality_Indicators_*.docx` files in the repository root are structured
 * field specifications produced by clinical governance: each carries tables of
 * capture fields (id, label, data type, value codes, validation logic, DEMS
 * v1.0 mapping) and tables of validation rules with a severity class.
 *
 * The mobile app cannot read .docx at runtime, so the tables are compiled into
 * a TypeScript module here and committed. Re-run this script whenever a source
 * document changes:
 *
 *   node scripts/generate-quality-indicators.mjs
 *
 * The generator is intentionally dependency free: .docx is a ZIP container, and
 * Node's built-in zlib is enough to inflate the one entry we need.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages/clinical/src/quality-indicators/generated-data.ts');

/** Source documents, in the order they should appear in the app. */
const SOURCES = [
  { file: 'Quality_Indicators_AMI.docx', id: 'ami', title: 'Acute Myocardial Infarction', short: 'AMI' },
  { file: 'Quality_Indicators_Stroke.docx', id: 'stroke', title: 'Stroke', short: 'Stroke' },
  { file: 'Quality_Indicators_Sepsis.docx', id: 'sepsis', title: 'Sepsis', short: 'Sepsis' },
  {
    file: 'Quality_Indicators_Cardiac_Arrest.docx',
    id: 'cardiac-arrest',
    title: 'Cardiac Arrest',
    short: 'Cardiac Arrest',
  },
  {
    file: 'Quality_Indicators_Respiratory_Emergencies.docx',
    id: 'respiratory-emergencies',
    title: 'Respiratory Emergencies',
    short: 'Respiratory',
  },
  {
    file: 'Quality_Indicators_Obstetrics.docx',
    id: 'obstetrics',
    title: 'Obstetric and Perinatal Care',
    short: 'Obstetrics',
  },
  {
    file: 'Quality_Indicators_Neonate_Paediatric.docx',
    id: 'neonate-paediatric',
    title: 'Neonatal and Paediatric Care',
    short: 'Neonate / Paediatric',
  },
  {
    file: 'Quality_Indicators_Trauma_Management.docx',
    id: 'trauma-management',
    title: 'Trauma Management',
    short: 'Trauma',
  },
  {
    file: 'Quality_Indicators_Behavioural_Emergencies_SA.docx',
    id: 'behavioural-emergencies',
    title: 'Behavioural Emergencies',
    short: 'Behavioural',
  },
  {
    file: 'Quality_Indicators_Critical_Care_Retrieval_HEMS_Road_FixedWing.docx',
    id: 'critical-care-retrieval',
    title: 'Critical Care Retrieval (HEMS / Road / Fixed Wing)',
    short: 'Critical Care',
  },
  {
    file: 'Pain_Management_Quality_Indicators_DEMS-V02.docx',
    id: 'pain-management',
    title: 'Pain Assessment and Management',
    short: 'Pain',
  },
];

const FIELD_HEADER = 'Field ID';
const RULE_HEADER = 'Rule ID';

/* ------------------------------------------------------------------ *
 * Minimal ZIP reader
 * ------------------------------------------------------------------ */

const SIG_LOCAL = 0x04034b50;

/** Inflate a single ZIP entry by local-header name, without a zip library. */
function readZipEntry(buffer, wanted) {
  for (let offset = 0; offset + 30 <= buffer.length; ) {
    if (buffer.readUInt32LE(offset) !== SIG_LOCAL) {
      offset += 1;
      continue;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    const dataStart = nameStart + nameLength + extraLength;

    if (name === wanted) {
      const raw = buffer.subarray(dataStart, dataStart + compressedSize);
      // 0 = stored, 8 = deflate. Anything else we cannot read.
      if (method === 0) return raw;
      if (method === 8) return inflateRawSync(raw);
      throw new Error(`Unsupported ZIP compression method ${method} for ${wanted}`);
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`ZIP entry not found: ${wanted}`);
}

/* ------------------------------------------------------------------ *
 * WordprocessingML extraction
 * ------------------------------------------------------------------ */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Text of every `<w:t>` run in a fragment, entities resolved. */
function runText(fragment) {
  const parts = [];
  const pattern = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t\s*\/>/g;
  let match;
  while ((match = pattern.exec(fragment)) !== null) {
    if (match[1] !== undefined) parts.push(match[1]);
  }
  return decodeEntities(parts.join('')).trim();
}

/**
 * Split a document body into top-level tables, skipping any that are nested
 * inside another table's cells, and return each as an array of row/cell text.
 */
function extractTables(xml) {
  const tables = [];
  let depth = 0;
  let current = null;
  const tagPattern = /<(\/?)w:(tbl|tr|tc)(?:\s[^>]*)?(\/?)>/g;
  let match;

  while ((match = tagPattern.exec(xml)) !== null) {
    const [, closing, name, selfClosing] = match;

    if (name === 'tbl') {
      if (closing) {
        depth -= 1;
        if (depth === 0 && current) {
          tables.push(current);
          current = null;
        }
      } else if (selfClosing) {
        // Empty table, nothing to collect.
      } else {
        depth += 1;
        if (depth === 1) current = [];
      }
      continue;
    }

    // Rows and cells are only interesting at the top table level.
    if (depth !== 1 || name !== 'tr' || closing) continue;

    const end = xml.indexOf('</w:tr>', tagPattern.lastIndex);
    if (end === -1) continue;
    const rowXml = xml.slice(tagPattern.lastIndex, end);
    tagPattern.lastIndex = end + 7;

    const cells = [];
    const cellPattern = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
      // A cell may hold several paragraphs; collapse them to one line of text.
      cells.push(runText(cellMatch[1]).replace(/\s+/g, ' ').trim());
    }
    current.push(cells);
  }

  return tables;
}

/** First non-empty paragraph of the document, used as the module description. */
function extractSummary(xml) {
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
  for (const paragraph of paragraphs) {
    const text = runText(paragraph).replace(/\s+/g, ' ').trim();
    // Skip the "DEMS ePCR Data Dictionary: ..." title line.
    if (text && !text.startsWith('DEMS ePCR Data Dictionary')) return text;
  }
  return '';
}

/* ------------------------------------------------------------------ *
 * Table -> typed rows
 * ------------------------------------------------------------------ */

const normalise = value => value.replace(/\s+/g, ' ').trim();

function buildModule(source, xml) {
  const tables = extractTables(xml);
  const fields = [];
  const rules = [];

  for (const table of tables) {
    if (table.length === 0) continue;
    const header = table[0].map(normalise);

    if (header[0] === FIELD_HEADER) {
      for (const row of table.slice(1)) {
        if (row.length < 3) continue;
        const [id, label, dataType, valueCodes = '', validation = '', demsMapping = ''] =
          row.map(normalise);
        if (!id) continue;
        fields.push({ id, label, dataType, valueCodes, validation, demsMapping });
      }
    } else if (header[0] === RULE_HEADER) {
      for (const row of table.slice(1)) {
        if (row.length < 4) continue;
        const [id, trigger, targetField, validationClass, action = ''] = row.map(normalise);
        if (!id) continue;
        rules.push({ id, trigger, targetField, validationClass, action });
      }
    }
    // Any other table (e.g. the reviewer changelog) is intentionally ignored.
  }

  return {
    id: source.id,
    title: source.title,
    short: source.short,
    sourceFile: source.file,
    summary: normalise(extractSummary(xml)),
    fields,
    rules,
  };
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const modules = SOURCES.map(source => {
  const xml = readZipEntry(readFileSync(join(ROOT, source.file)), 'word/document.xml').toString(
    'utf8'
  );
  return buildModule(source, xml);
});

const fieldCount = modules.reduce((sum, m) => sum + m.fields.length, 0);
const ruleCount = modules.reduce((sum, m) => sum + m.rules.length, 0);

// Fail loudly rather than committing a silently truncated dataset.
for (const module of modules) {
  if (module.fields.length === 0) {
    throw new Error(`No capture fields parsed from ${module.sourceFile} - parser regression`);
  }
  if (!module.summary) {
    throw new Error(`No summary parsed from ${module.sourceFile} - parser regression`);
  }
}

const body = modules
  .map(module => `  {
    id: ${JSON.stringify(module.id)},
    title: ${JSON.stringify(module.title)},
    short: ${JSON.stringify(module.short)},
    sourceFile: ${JSON.stringify(module.sourceFile)},
    summary: ${JSON.stringify(module.summary)},
    fields: [
${module.fields
  .map(
    field => `      {
        id: ${JSON.stringify(field.id)},
        label: ${JSON.stringify(field.label)},
        dataType: ${JSON.stringify(field.dataType)},
        valueCodes: ${JSON.stringify(field.valueCodes)},
        validation: ${JSON.stringify(field.validation)},
        demsMapping: ${JSON.stringify(field.demsMapping)},
      },`
  )
  .join('\n')}
    ],
    rules: [
${module.rules
  .map(
    rule => `      {
        id: ${JSON.stringify(rule.id)},
        trigger: ${JSON.stringify(rule.trigger)},
        targetField: ${JSON.stringify(rule.targetField)},
        validationClass: ${JSON.stringify(rule.validationClass)},
        action: ${JSON.stringify(rule.action)},
      },`
  )
  .join('\n')}
    ],
  },`)
  .join('\n');

const file = `/**
 * Quality indicator modules, generated from the DEMS ePCR data dictionary
 * documents in the repository root. Do not edit by hand.
 *
 * Regenerate with:
 *   node scripts/generate-quality-indicators.mjs
 *
 * Source documents: ${SOURCES.map(s => s.file).join(', ')}
 *
 * ${modules.length} modules, ${fieldCount} capture fields, ${ruleCount} validation rules.
 */
import type { QualityIndicatorModule } from './types';

export const QUALITY_INDICATOR_MODULES: QualityIndicatorModule[] = [
${body}
];
`;

writeFileSync(OUT, file, 'utf8');

console.log(
  `Wrote ${OUT}\n  ${modules.length} modules, ${fieldCount} capture fields, ${ruleCount} validation rules`
);
for (const module of modules) {
  console.log(
    `  ${module.id.padEnd(26)} ${String(module.fields.length).padStart(3)} fields  ${String(
      module.rules.length
    ).padStart(2)} rules`
  );
}
