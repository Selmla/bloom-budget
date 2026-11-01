const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

async function workerChecks() {
  const listeners = {},
    stores = new Map(),
    deleted = [],
    added = [];
  let offline = false,
    html =
      '<html>v2<script src="/_next/static/app-v2.js"></script><link href="/_next/static/app-v2.css"></html>';
  const key = (request) =>
    typeof request === "string" ? request : request.url;
  const fetcher = async (request) => {
    if (offline) throw new Error("offline");
    return new Response(key(request).includes("_next") ? "asset v2" : html);
  };
  const cache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async addAll(urls) {
        for (const url of urls) {
          added.push(url);
          store.set(url, await fetcher(url));
        }
      },
      async match(request) {
        return store.get(key(request))?.clone();
      },
      async put(request, response) {
        store.set(key(request), response);
      },
    };
  };
  stores.set("bloom-budget-v1", new Map());
  stores.set("another-app-cache", new Map());
  let claimed = false,
    skipped = false;
  const context = {
    URL,
    Response,
    Set,
    self: {
      location: { origin: "https://bloom.test" },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      skipWaiting: async () => {
        skipped = true;
      },
      addEventListener: (name, fn) => (listeners[name] = fn),
    },
    importScripts: () => (context.self.BLOOM_BUILD = "test-v2"),
    caches: {
      open: async (name) => cache(name),
      keys: async () => [...stores.keys()],
      delete: async (name) => {
        deleted.push(name);
        stores.delete(name);
      },
    },
    fetch: fetcher,
  };
  Object.defineProperty(context, "localStorage", {
    get() {
      throw new Error("Worker must never access saved budget");
    },
  });
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), context);
  let pending;
  listeners.install({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.ok(skipped);
  assert.ok(
    added.includes("https://bloom.test/_next/static/app-v2.js"),
    "New deployment scripts are cached before activation",
  );
  assert.ok(added.includes("https://bloom.test/_next/static/app-v2.css"));
  listeners.activate({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.ok(claimed);
  assert.deepEqual(
    deleted,
    ["bloom-budget-v1"],
    "Only old app caches are removed, not unrelated storage",
  );
  async function request(
    destination,
    mode = "cors",
    url = "https://bloom.test/",
  ) {
    let result;
    listeners.fetch({
      request: { method: "GET", url, destination, mode },
      respondWith: (p) => (result = p),
    });
    return result ? (await result).text() : undefined;
  }
  html = "<html>newest online document</html>";
  assert.equal(
    await request("document", "navigate"),
    html,
    "Navigation is network first, never stale-cache first",
  );
  offline = true;
  assert.equal(
    await request("document", "navigate"),
    html,
    "Offline falls back to the last known document",
  );
  assert.equal(
    await request(
      "script",
      "cors",
      "https://bloom.test/_next/static/app-v2.js",
    ),
    "asset v2",
  );
  assert.equal(
    await request("", "cors", "https://bloom.test/?_rsc=abc"),
    undefined,
    "Flight data cannot replace document cache",
  );
  assert.equal(
    await request("script", "cors", "https://bloom.test/sw.js"),
    undefined,
    "Worker update script bypasses cache",
  );
}

async function updaterChecks(
  initialController,
  blockSave = false,
  noWorker = false,
) {
  let serverVersion = "v1";
  let effect,
    observer,
    timer,
    reloads = 0,
    flushes = 0,
    waiting = false,
    busy = true,
    cleared = false;
  const events = {},
    swEvents = {};
  const document = {
    visibilityState: "visible",
    body: {},
    activeElement: { matches: () => false },
    querySelector: () => (busy ? {} : null),
    addEventListener: (n, f) => (events[n] = f),
    removeEventListener: (n) => delete events[n],
  };
  const window = {
    location: { reload: () => reloads++ },
    setInterval: (fn) => ((timer = fn), 1),
    clearInterval: () => (cleared = true),
    dispatchEvent: () => {
      flushes++;
      return !blockSave;
    },
    addEventListener: (n, f) => (events[n] = f),
    removeEventListener: (n) => delete events[n],
  };
  const navigator = {
    serviceWorker: {
      controller: initialController ? {} : null,
      addEventListener: (n, f) => (swEvents[n] = f),
      removeEventListener: (n) => delete swEvents[n],
      register: async () => ({ update: async () => {} }),
    },
  };
  const context = {
    document,
    window,
    navigator: noWorker ? {} : navigator,
    process: { env: { NEXT_PUBLIC_BLOOM_BUILD: "v1" } },
    fetch: async () => ({
      ok: true,
      text: async () => 'self.BLOOM_BUILD = "' + serverVersion + '";',
    }),
    Event,
    exports: {},
    require: () => ({
      useEffect: (fn) => (effect = fn),
      useState: () => [false, (value) => (waiting = value)],
    }),
    MutationObserver: class {
      constructor(fn) {
        observer = fn;
      }
      observe() {}
      disconnect() {}
    },
  };
  const code = ts.transpileModule(
    fs.readFileSync("lib/useAppUpdates.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(code, context);
  context.exports.useAppUpdates(true);
  const cleanup = effect();
  await Promise.resolve();
  if (!initialController && !noWorker) {
    swEvents.controllerchange();
    assert.equal(reloads, 0, "First install does not reload needlessly");
  }
  if (noWorker) {
    serverVersion = "v2";
    timer();
    for (let i = 0; i < 8; i++) await Promise.resolve();
  } else swEvents.controllerchange();
  assert.ok(waiting);
  assert.equal(reloads, 0, "An open form postpones the update");
  busy = false;
  observer();
  assert.equal(
    flushes,
    1,
    "Latest state is flushed synchronously before reload",
  );
  assert.equal(reloads, blockSave ? 0 : 1, "Failed persistence cancels reload");
  if (!blockSave) {
    timer();
    assert.equal(reloads, 1, "No reload loop");
  }
  cleanup();
  assert.ok(cleared);
}
(async () => {
  await workerChecks();
  await updaterChecks(true);
  await updaterChecks(false);
  await updaterChecks(true, true);
  await updaterChecks(false, false, true);
  console.log(
    "Automatic updates, editing protection, offline assets and storage safety passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
