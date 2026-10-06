// Preloaded by scripts/dev.sh alone (`--require`). Node 25 removed `buffer.SlowBuffer`, and
// `buffer-equal-constant-time` (jsonwebtoken → jws → jwa, under firebase-admin; unmaintained, every jwa still needs
// it) reads `SlowBuffer.prototype` at load: firebase-admin then fails to load at all. Kedalia's image runs Node 26;
// the build, the CI and Vercel run Node 22 and never load this file.
const buffer = require('node:buffer')
if (buffer.SlowBuffer === undefined) buffer.SlowBuffer = buffer.Buffer
