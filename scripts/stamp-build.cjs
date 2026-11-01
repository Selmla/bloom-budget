const fs = require("node:fs");
const crypto = require("node:crypto");
// Imported by the service worker: every deployment changes this dependency,
// even when the worker's own source stays unchanged.
fs.writeFileSync(
  "public/build-version.js",
  "self.BLOOM_BUILD = " + JSON.stringify(crypto.randomUUID()) + ";\n",
);
