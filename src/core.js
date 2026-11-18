'use strict';

// Only real strings count as names, versions, types, package URLs and licenses (damaged files carry numbers or objects).
const S = (v) => (typeof v === 'string' ? v : '');
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Parses the text of a file; some tools save SBOMs with a byte order mark.
function parseText(text) {
  if (typeof text !== 'string') return { ok: false, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text.replace(/^﻿/, '')) };
  } catch (e) {
    return { ok: false, value: undefined };
  }
}

function detectObject(obj) {
  if (!isObject(obj)) return { format: 'unknown', version: '' };
  if (obj.bomFormat === 'CycloneDX') return { format: 'CycloneDX', version: S(obj.specVersion) };
  if (typeof obj.spdxVersion === 'string') return { format: 'SPDX', version: obj.spdxVersion };
  return { format: 'unknown', version: '' };
}

function detectSbom(text) {
  return detectObject(parseText(text).value);
}

// Why a text is not JSON, in words a user can act on.
function jsonReason(text) {
  const t = String(text || '').replace(/^﻿/, '').trim();
  if (!t) return 'the file is empty';
  if (t.startsWith('<')) return 'it looks like an XML SBOM; only the JSON formats of CycloneDX and SPDX are supported';
  if (/^SPDXVersion\s*:/m.test(t)) return 'it looks like an SPDX tag-value file; only the JSON formats of CycloneDX and SPDX are supported';
  return 'the text is not JSON';
}

// CycloneDX component name: npm-style groups (starting with '@') join with '/', other groups (Maven style) with ':'.
function cdxName(c) {
  const name = S(c.name);
  const group = S(c.group);
  if (!name || !group) return name;
  return group + (group.charAt(0) === '@' ? '/' : ':') + name;
}

// One licenses[] entry of a CycloneDX component: license id, else license name, else expression.
function cdxLicense(entry) {
  if (!isObject(entry)) return '';
  const lic = isObject(entry.license) ? entry.license : {};
  return S(lic.id) || S(lic.name) || S(entry.expression);
}

// The components of a parsed SBOM as the raw objects of the file, nested CycloneDX components right after their parent.
function rawComponents(obj, format) {
  const out = [];
  if (format === 'CycloneDX') {
    if (!Array.isArray(obj.components)) return out;
    // Explicit stack: the nesting depth of a file is unbounded.
    const stack = [];
    const pushAll = (list) => { for (let i = list.length - 1; i >= 0; i--) stack.push(list[i]); };
    pushAll(obj.components);
    while (stack.length > 0) {
      const c = stack.pop();
      if (!isObject(c)) continue;
      out.push(c);
      if (Array.isArray(c.components)) pushAll(c.components);
    }
  } else if (format === 'SPDX') {
    if (Array.isArray(obj.packages)) {
      for (const p of obj.packages) if (isObject(p)) out.push(p);
    }
  }
  return out;
}

// SPDX: licenseConcluded NONE means no license; only NOASSERTION (or no value) falls back to licenseDeclared.
function spdxLicenses(p) {
  const concluded = S(p.licenseConcluded);
  if (concluded === 'NONE') return [];
  if (concluded && concluded !== 'NOASSERTION') return [concluded];
  const declared = S(p.licenseDeclared);
  return declared && declared !== 'NOASSERTION' && declared !== 'NONE' ? [declared] : [];
}

function spdxPurl(p) {
  if (!Array.isArray(p.externalRefs)) return '';
  for (const ref of p.externalRefs) {
    if (isObject(ref) && ref.referenceType === 'purl' && S(ref.referenceLocator)) return ref.referenceLocator;
  }
  return '';
}

function toComponent(raw, format) {
  if (format === 'CycloneDX') {
    const licenses = [];
    if (Array.isArray(raw.licenses)) {
      for (const entry of raw.licenses) {
        const id = cdxLicense(entry);
        if (id) licenses.push(id);
      }
    }
    return { name: cdxName(raw), version: S(raw.version), type: S(raw.type) || 'library', purl: S(raw.purl), licenses };
  }
  return {
    name: S(raw.name),
    version: S(raw.versionInfo),
    type: S(raw.primaryPackagePurpose) ? raw.primaryPackagePurpose.toLowerCase() : 'package',
    purl: spdxPurl(raw),
    licenses: spdxLicenses(raw)
  };
}

function normalizeComponents(text) {
  const obj = parseText(text).value;
  const format = detectObject(obj).format;
  if (format === 'unknown') return [];
  return rawComponents(obj, format).map((raw) => toComponent(raw, format));
}

// The scheme is case-insensitive and may be followed by slashes: pkg:npm/x, PKG:npm/x, pkg://npm/x.
function purlType(purl) {
  if (typeof purl !== 'string' || !/^pkg:/i.test(purl)) return '';
  const rest = purl.slice(4).replace(/^\/+/, '');
  const slash = rest.indexOf('/');
  if (slash <= 0) return '';
  return rest.slice(0, slash).toLowerCase();
}

// SPDX license ids are compared case-insensitively.
function lowerSet(ids) { return new Set(ids.map((x) => x.toLowerCase())); }

const PERMISSIVE = lowerSet([
  'MIT', 'MIT-0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Zlib', 'Unlicense', 'CC0-1.0', 'BSL-1.0', 'Python-2.0', 'PSF-2.0'
]);
const WEAK = lowerSet([
  'LGPL-2.0-only', 'LGPL-2.0-or-later', 'LGPL-2.1-only', 'LGPL-2.1-or-later', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'LGPL-2.1', 'LGPL-3.0', 'MPL-1.1', 'MPL-2.0', 'EPL-1.0', 'EPL-2.0', 'CDDL-1.0', 'CDDL-1.1'
]);
const STRONG = lowerSet([
  'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-3.0-only', 'GPL-3.0-or-later', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'GPL-2.0', 'GPL-2.0+', 'GPL-3.0', 'GPL-3.0+', 'AGPL-3.0'
]);

// Index in this list = restrictiveness (OR takes the smaller index, AND the larger one).
const CATEGORIES = ['permissive', 'weak copyleft', 'strong copyleft', 'unknown'];
const MAX_NESTING = 64;
const MALFORMED = new Error('malformed license expression');

function idRank(id) {
  const key = id.toLowerCase();
  if (PERMISSIVE.has(key)) return 0;
  if (WEAK.has(key)) return 1;
  if (STRONG.has(key)) return 2;
  return 3;
}

const isOperator = (t) => /^(and|or|with)$/i.test(t);

// Recursive descent over the tokens of an SPDX expression:
//   or-expr  = and-expr { OR and-expr }       least restrictive alternative
//   and-expr = term { AND term }              most restrictive part
//   term     = '(' or-expr ')' | id [ WITH exception-id ]
function rankOfExpression(tokens) {
  let pos = 0;
  const peekIs = (word) => pos < tokens.length && tokens[pos].toUpperCase() === word;

  function parseOr(depth) {
    let best = parseAnd(depth);
    while (peekIs('OR')) {
      pos++;
      best = Math.min(best, parseAnd(depth));
    }
    return best;
  }

  function parseAnd(depth) {
    let worst = parseTerm(depth);
    while (peekIs('AND')) {
      pos++;
      worst = Math.max(worst, parseTerm(depth));
    }
    return worst;
  }

  function parseTerm(depth) {
    if (pos >= tokens.length) throw MALFORMED;
    const token = tokens[pos];
    if (token === '(') {
      if (depth >= MAX_NESTING) throw MALFORMED;
      pos++;
      const inner = parseOr(depth + 1);
      if (tokens[pos] !== ')') throw MALFORMED;
      pos++;
      return inner;
    }
    if (token === ')' || isOperator(token)) throw MALFORMED;
    pos++;
    const rank = idRank(token);
    if (peekIs('WITH')) {
      pos++;
      const exception = tokens[pos];
      if (exception === undefined || exception === '(' || exception === ')' || isOperator(exception)) throw MALFORMED;
      pos++;
    }
    return rank;
  }

  const rank = parseOr(0);
  if (pos !== tokens.length) throw MALFORMED;
  return rank;
}

function licenseCategory(license) {
  if (typeof license !== 'string') return 'unknown';
  const tokens = license.match(/\(|\)|[^\s()]+/g);
  if (!tokens) return 'unknown';
  try {
    return CATEGORIES[rankOfExpression(tokens)];
  } catch (e) {
    return 'unknown';
  }
}

// Category of a component: its licenses combined with AND, each one in parentheses.
function componentCategory(licenses) {
  if (licenses.length === 0) return 'unknown';
  return licenseCategory(licenses.map((l) => '(' + l + ')').join(' AND '));
}

// Text from the file written into Markdown: line breaks become spaces and every character with a Markdown or HTML meaning
// is backslash-escaped, so an SBOM can never add links, images, HTML, math or table cells to a report. '://' and a 'www.'
// at the start of a word are broken up as well, so the preview does not turn a bare web address into a link.
// The report's own placeholder '(none)' is kept as it is.
function escapeCell(str) {
  const s = String(str);
  if (s === '(none)') return s;
  return s
    .replace(/[\r\n]+/g, ' ')
    .replace(/([\\`*_{}\[\]()#+!|<>~&$])/g, '\\$1')
    .replace(/:\/\//g, '\\:\\/\\/')
    .replace(/(^|[^A-Za-z0-9])(www)\./gi, '$1$2\\.');
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

// Names and versions sort numerically where they contain numbers (2 before 10); equal keys fall back to plain order.
const collator = new Intl.Collator('en', { numeric: true });
function compareText(a, b) {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}
function compareByNameVersion(a, b) {
  return compareText(a.name, b.name) || compareText(a.version, b.version);
}

// Name and version of the product an SBOM describes.
function subjectOf(obj, format) {
  if (format === 'CycloneDX') {
    const comp = isObject(obj.metadata) && isObject(obj.metadata.component) ? obj.metadata.component : null;
    const name = comp ? cdxName(comp) : '';
    if (!name) return 'unnamed';
    const version = S(comp.version);
    return version ? name + ' ' + version : name;
  }
  return S(obj.name) || 'unnamed';
}

// Parses, detects and normalizes once for a report; `md` is set when the report is already complete.
function loadSbom(text, heading) {
  const parsed = parseText(text);
  if (!parsed.ok) return { md: heading + '\n\nThis file is not a valid SBOM: ' + jsonReason(text) + '.' };
  const det = detectObject(parsed.value);
  if (det.format === 'unknown') return { md: heading + '\n\nThis file is not a valid SBOM: it is neither CycloneDX nor SPDX.' };
  const raws = rawComponents(parsed.value, det.format);
  if (raws.length === 0) return { md: heading + '\n\nThe SBOM lists no components.' };
  return { obj: parsed.value, det, raws, comps: raws.map((raw) => toComponent(raw, det.format)) };
}

const licensesText = (c) => (c.licenses.length > 0 ? c.licenses.join(', ') : '(none)');

// Every report takes (text, context); context is an optional { fileName } that no report uses.
function reportSummary(text, context) {
  const loaded = loadSbom(text, '# SBOM Summary');
  if (loaded.md) return loaded.md;
  const { obj, det, comps } = loaded;
  const n = comps.length;
  const version = det.version.replace(/^SPDX-/, '');

  let withVersion = 0;
  let withLicense = 0;
  let withPurl = 0;
  const ecosystems = new Map();
  for (const c of comps) {
    if (c.version) withVersion++;
    if (c.licenses.length > 0) withLicense++;
    if (c.purl) withPurl++;
    const key = purlType(c.purl) || '(none)';
    ecosystems.set(key, (ecosystems.get(key) || 0) + 1);
  }
  const rows = [...ecosystems.entries()].sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]));

  const lines = [
    '# SBOM Summary',
    '',
    `${det.format}${version ? ' ' + escapeCell(version) : ''} SBOM for ${escapeCell(subjectOf(obj, det.format))}.`,
    '',
    `${n} ${pluralize(n, 'component', 'components')}.`,
    '',
    `${withVersion} with a version, ${withLicense} with a license, ${withPurl} with a package URL.`,
    '',
    '| Ecosystem | Components |',
    '|---|---|'
  ];
  for (const [eco, count] of rows) lines.push(`| ${escapeCell(eco)} | ${count} |`);
  return lines.join('\n');
}

function reportComponents(text, context) {
  const loaded = loadSbom(text, '# Components');
  if (loaded.md) return loaded.md;
  const n = loaded.comps.length;
  const limit = 1000;
  const sorted = [...loaded.comps].sort(compareByNameVersion);

  const lines = [
    '# Components',
    '',
    `${n} ${pluralize(n, 'component', 'components')}.`,
    '',
    '| Name | Version | Type | Licenses | PURL |',
    '|---|---|---|---|---|'
  ];
  for (const c of sorted.slice(0, limit)) {
    lines.push(`| ${escapeCell(c.name)} | ${escapeCell(c.version)} | ${escapeCell(c.type)} | ${escapeCell(licensesText(c))} | ${escapeCell(c.purl)} |`);
  }
  if (n > limit) {
    lines.push('');
    lines.push(`Showing the first ${limit} of ${n} components.`);
  }
  return lines.join('\n');
}

function reportDuplicates(text, context) {
  const loaded = loadSbom(text, '# Duplicate Components');
  if (loaded.md) return loaded.md;

  // Components without a version are ignored: a name is a duplicate only with two or more different non-empty versions.
  const versionsByName = new Map();
  for (const c of loaded.comps) {
    if (!c.version) continue;
    if (!versionsByName.has(c.name)) versionsByName.set(c.name, new Set());
    versionsByName.get(c.name).add(c.version);
  }
  const dups = [];
  for (const [name, versions] of versionsByName) {
    if (versions.size >= 2) dups.push({ name, versions: [...versions].sort(compareText) });
  }
  dups.sort((a, b) => compareText(a.name, b.name));

  if (dups.length === 0) return '# Duplicate Components\n\nNo component appears with more than one version.';

  const lines = [
    '# Duplicate Components',
    '',
    `${dups.length} ${pluralize(dups.length, 'component', 'components')} with several versions.`,
    '',
    '| Name | Versions |',
    '|---|---|'
  ];
  for (const d of dups) lines.push(`| ${escapeCell(d.name)} | ${escapeCell(d.versions.join(', '))} |`);
  return lines.join('\n');
}

function reportLicenseRisk(text, context) {
  const loaded = loadSbom(text, '# License Risk');
  if (loaded.md) return loaded.md;

  const counts = new Map(CATEGORIES.map((c) => [c, 0]));
  const review = [];
  for (const c of loaded.comps) {
    const category = componentCategory(c.licenses);
    counts.set(category, counts.get(category) + 1);
    if (category === 'strong copyleft' || category === 'unknown') review.push({ c, category });
  }

  const lines = ['# License Risk', '', '| Category | Components |', '|---|---|'];
  for (const category of CATEGORIES) lines.push(`| ${category} | ${counts.get(category)} |`);
  lines.push('', '## Needs review', '');

  if (review.length === 0) {
    lines.push('Nothing needs review.');
  } else {
    review.sort((a, b) => compareByNameVersion(a.c, b.c));
    lines.push('| Name | Version | Licenses | Category |', '|---|---|---|---|');
    for (const { c, category } of review) {
      lines.push(`| ${escapeCell(c.name)} | ${escapeCell(c.version)} | ${escapeCell(licensesText(c))} | ${escapeCell(category)} |`);
    }
  }
  return lines.join('\n');
}

// Dependency relationship types of SPDX 2.x that express a dependency, containment or link between elements.
const SPDX_DEPENDENCY_TYPES = new Set([
  'DEPENDS_ON', 'DEPENDENCY_OF', 'CONTAINS', 'CONTAINED_BY',
  'RUNTIME_DEPENDENCY_OF', 'BUILD_DEPENDENCY_OF', 'DEV_DEPENDENCY_OF', 'OPTIONAL_DEPENDENCY_OF',
  'PROVIDED_DEPENDENCY_OF', 'TEST_DEPENDENCY_OF', 'DEPENDENCY_MANIFEST_OF', 'STATIC_LINK', 'DYNAMIC_LINK'
]);

// CycloneDX author of the SBOM data: authors, the manufacturer or supplier of the BOM, or the tool that created it.
function cdxHasAuthor(meta) {
  if (Array.isArray(meta.authors) && meta.authors.length > 0) return true;
  for (const key of ['manufacture', 'manufacturer', 'supplier']) {
    if (isObject(meta[key]) && S(meta[key].name)) return true;
  }
  const tools = meta.tools;
  if (Array.isArray(tools)) return tools.length > 0;
  if (isObject(tools)) {
    return (Array.isArray(tools.components) && tools.components.length > 0) || (Array.isArray(tools.services) && tools.services.length > 0);
  }
  return false;
}

function reportMinimumElements(text, context) {
  const loaded = loadSbom(text, '# NTIA Minimum Elements');
  if (loaded.md) return loaded.md;
  const { obj, det, raws, comps } = loaded;
  const n = comps.length;
  const cyclone = det.format === 'CycloneDX';

  let author, timestamp, dependencies;
  if (cyclone) {
    const meta = isObject(obj.metadata) ? obj.metadata : {};
    author = cdxHasAuthor(meta);
    timestamp = S(meta.timestamp) !== '';
    dependencies = Array.isArray(obj.dependencies) && obj.dependencies.length > 0;
  } else {
    const info = isObject(obj.creationInfo) ? obj.creationInfo : {};
    author = Array.isArray(info.creators) && info.creators.length > 0;
    timestamp = S(info.created) !== '';
    dependencies = Array.isArray(obj.relationships) && obj.relationships.some((r) => isObject(r) && SPDX_DEPENDENCY_TYPES.has(r.relationshipType));
  }

  let supplierPresent = 0;
  let idPresent = 0;
  for (const raw of raws) {
    if (cyclone) {
      if (isObject(raw.supplier) && S(raw.supplier.name)) supplierPresent++;
      if (S(raw.purl) || S(raw.cpe)) idPresent++;
    } else {
      if (S(raw.supplier) && raw.supplier !== 'NOASSERTION') supplierPresent++;
      const refs = Array.isArray(raw.externalRefs) ? raw.externalRefs : [];
      if (refs.some((r) => isObject(r) && ['purl', 'cpe22Type', 'cpe23Type'].includes(r.referenceType) && S(r.referenceLocator))) idPresent++;
    }
  }
  const namePresent = comps.filter((c) => c.name).length;
  const versionPresent = comps.filter((c) => c.version).length;

  const yesNo = (b) => (b ? 'yes' : 'no');
  const covered = [author, timestamp, dependencies].filter(Boolean).length +
    [supplierPresent, namePresent, versionPresent, idPresent].filter((count) => count === n).length;

  return [
    '# NTIA Minimum Elements',
    '',
    '| Document element | Present |',
    '|---|---|',
    `| Author of SBOM data | ${yesNo(author)} |`,
    `| Timestamp | ${yesNo(timestamp)} |`,
    `| Dependency relationships | ${yesNo(dependencies)} |`,
    '',
    '| Component element | Present | Missing |',
    '|---|---|---|',
    `| Supplier name | ${supplierPresent} | ${n - supplierPresent} |`,
    `| Component name | ${namePresent} | ${n - namePresent} |`,
    `| Version | ${versionPresent} | ${n - versionPresent} |`,
    `| Unique identifier | ${idPresent} | ${n - idPresent} |`,
    '',
    `${covered} of 7 minimum elements fully covered.`
  ].join('\n');
}

module.exports = {
  detectSbom,
  normalizeComponents,
  purlType,
  licenseCategory,
  reportSummary,
  reportComponents,
  reportDuplicates,
  reportLicenseRisk,
  reportMinimumElements
};
