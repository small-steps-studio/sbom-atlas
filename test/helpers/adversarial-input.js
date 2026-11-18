'use strict';
// Hostile and odd SBOMs for the adversarial test (invented; the payloads must come out as plain escaped text).
const PAY = ['x | <b>y</b> [link](https://evil.test)', '![t](https://evil.test/p.png)', '<img src=https://evil.test/i.png>', '`code` *b* _i_ ~s~ # h', '<script>alert(1)</script>', 'a|b|c', 'Cost $5 and $x$ here', '\\| escaped', 'line\nbreak',
  'see https://evil.test/a?b=c and www.evil.test, mailto:x@evil.test', '\\://', '(MIT OR (Apache-2.0'];
const cases = [];
PAY.forEach((p, i) => {
  cases.push({ name: 'cyclonedx ' + i, text: JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5', metadata: { component: { name: p, version: p }, authors: [{ name: p }] },
    components: [{ name: p, version: p, type: p, purl: 'pkg:npm/' + p + '@1', licenses: [{ license: { name: p } }, { expression: p }], supplier: { name: p } }, { name: p, version: '2' + p }] }) });
  cases.push({ name: 'spdx ' + i, text: JSON.stringify({ spdxVersion: 'SPDX-2.3', name: p, creationInfo: { creators: [p], created: p },
    packages: [{ name: p, versionInfo: p, licenseConcluded: p, supplier: p, primaryPackagePurpose: p, externalRefs: [{ referenceType: 'purl', referenceLocator: p }] }, { name: p, versionInfo: 'x' + p }] }) });
});
cases.push({ name: 'metadata junk', text: JSON.stringify({ bomFormat: 'CycloneDX', specVersion: 5, metadata: { component: { name: { a: 1 }, version: 7 }, authors: 'x', tools: null }, components: [{ name: 'a', version: '1' }] }) });
cases.push({ name: 'spdx junk', text: JSON.stringify({ spdxVersion: 'SPDX-2.3', name: ['x'], creationInfo: 'y', relationships: [null, 'x', { relationshipType: 5 }], packages: [{ name: 'a', externalRefs: [null, 'x'], supplier: { a: 1 } }] }) });
// Names that are also properties of every object, groups and metadata of the wrong type, and nesting far deeper than the call stack.
const NAMES = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];
cases.push({ name: 'prototype names', text: JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5', metadata: { component: { name: 'constructor', version: '__proto__' } },
  components: NAMES.flatMap((n, i) => [{ name: n, version: '1.' + i, purl: 'pkg:' + n + '/' + n + '@1', licenses: [{ license: { name: n } }] }, { name: n, version: '2.' + i }]) }) });
cases.push({ name: 'spdx prototype names', text: JSON.stringify({ spdxVersion: 'SPDX-2.3', name: '__proto__', packages: NAMES.flatMap((n) => [{ name: n, versionInfo: '1' }, { name: n, versionInfo: '2', licenseConcluded: n }]) }) });
cases.push({ name: 'group and metadata types', text: JSON.stringify({ bomFormat: 'CycloneDX', specVersion: ['1.5'], metadata: { component: { group: { a: 1 }, name: 'x', version: [1] }, manufacturer: { name: ['x'] }, tools: { components: 'x', services: 5 }, timestamp: {} },
  components: [{ group: 5, name: 'a', version: '1' }, { group: ['@x'], name: 'b', version: '2' }, { group: '@x', name: 7, version: '3' }, { group: '@', name: '@', version: '' }, { group: 'g', name: 'n', version: 'v' }] }) });
cases.push({ name: 'deep nesting', text: '{"bomFormat":"CycloneDX","specVersion":"1.5","components":' + '[{"name":"n","version":"1","licenses":[{"license":{"id":"MIT"}}],"components":'.repeat(20000) + '[]' + '}]'.repeat(20000) + '}' });
cases.push({ name: 'deep license parentheses', text: JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5', components: [{ name: 'a', version: '1', licenses: [{ expression: '('.repeat(20000) + 'MIT' + ')'.repeat(20000) }] },
  { name: 'b', version: '1', licenses: [{ expression: 'MIT OR '.repeat(20000) + 'MIT' }] }, { name: 'c', version: '1', licenses: [{ expression: '('.repeat(20000) }] }] }) });
module.exports = { cases };
