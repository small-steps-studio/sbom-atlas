'use strict';
// Builds a CycloneDX JSON text of about `bytes` characters for the large-file test (invented components).
function make(bytes) {
  const parts = ['{"bomFormat":"CycloneDX","specVersion":"1.5","metadata":{"timestamp":"2026-02-11T08:30:00Z","component":{"name":"big-app","version":"1.0.0"}},"components":['];
  let size = parts[0].length, i = 0;
  const lic = ['MIT', 'Apache-2.0', 'GPL-3.0-only', 'LGPL-2.1-or-later', 'Example Licence'];
  while (size < bytes) {
    const c = '{"type":"library","name":"pkg-' + (i % 50000) + '","version":"' + (i % 7) + '.' + (i % 13) + '.0","purl":"pkg:npm/pkg-' + (i % 50000) + '@' + (i % 7) + '.' + (i % 13) + '.0",' +
      '"licenses":[{"license":{"id":"' + lic[i % lic.length] + '"}}],"supplier":{"name":"Example Labs"},"description":"' + 'x'.repeat(200) + '"}';
    parts.push((i ? ',' : '') + c); size += c.length + 1; i++;
  }
  parts.push('],"dependencies":[{"ref":"big-app","dependsOn":[]}]}');
  return parts.join('');
}
module.exports = { make };
