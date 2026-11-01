const fs = require("node:fs");
let buildVersion = "development";
try {
  buildVersion = fs
    .readFileSync("public/build-version.js", "utf8")
    .match(/"([^"]+)"/)[1];
} catch {}
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BLOOM_BUILD: buildVersion },
  async headers() {
    return ["/sw.js", "/build-version.js"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
    }));
  },
};

module.exports = nextConfig;
