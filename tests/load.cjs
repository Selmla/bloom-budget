const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = {};
module.exports = function load(filename) {
  const file = path.resolve(filename);
  if (cache[file]) return cache[file].exports;
  const mod = (cache[file] = { exports: {} });
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "exports", "module", code)(
    (name) => module.exports(path.join(path.dirname(file), name + ".ts")),
    mod.exports,
    mod,
  );
  return mod.exports;
};
