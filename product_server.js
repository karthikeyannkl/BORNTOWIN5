const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 10000);
const TTL_DAYS = Math.max(1, Number(process.env.DATA_TTL_DAYS || 30));
const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "magizh-test-data.json");

// Serialize state writes inside this Node process. Without a queue, two near-simultaneous
// PUT requests could each read the same old store and the later write could erase the other change.
let writeQueue = Promise.resolve();

function queuedStateWrite(mutator) {
  const job = writeQueue.then(() => {
    const store = readStore();
    mutator(store.state);
    return writeStore(store.state);
  });
  writeQueue = job.catch(() => {});
  return job;
}

const DEFAULT_STATE = {
  magizhUsers: {},
  magizhOrders: [],
  magizhProducts: null,
  magizhCategories: null,
  magizhSettings: {},
  magizhB5: {},
  magizhCoinWallet: "0",
  magizhAdminPassword: null,
  magizhCurrentUser: null,
  magizhCurrentUserId: "GUEST"
};

function freshStore() {
  const now = Date.now();
  return {
    updatedAt: now,
    expiresAt: now + TTL_DAYS * 86400000,
    ttlDays: TTL_DAYS,
    state: { ...DEFAULT_STATE }
  };
}

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return freshStore();

    const data = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    if (!data.expiresAt || Date.now() > data.expiresAt) {
      return freshStore();
    }

    return {
      updatedAt: data.updatedAt || Date.now(),
      expiresAt: data.expiresAt,
      ttlDays: data.ttlDays || TTL_DAYS,
      state: {
        ...DEFAULT_STATE,
        ...(data.state || {})
      }
    };
  } catch (error) {
    console.error("[STORE_READ_ERROR]", error);
    return freshStore();
  }
}

function writeStore(state) {
  const now = Date.now();

  const data = {
    updatedAt: now,
    expiresAt: now + TTL_DAYS * 86400000,
    ttlDays: TTL_DAYS,
    state: {
      ...DEFAULT_STATE,
      ...state
    }
  };

  const temp = DATA_FILE + ".tmp";

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  fs.renameSync(temp, DATA_FILE);

  return data;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  res.end(JSON.stringify(body));
}

function sendFile(res, filename, type) {
  const filePath = path.join(ROOT, filename);

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 404, {
      ok: false,
      error: filename + " not found"
    });
  }

  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-cache"
  });

  res.end(fs.readFileSync(filePath));
}

async function readBody(req) {
  let raw = "";

  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  const requestId =
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8);

  try {
    const url = new URL(
      req.url || "/",
      "http://" + (req.headers.host || "localhost")
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      return res.end();
    }

    if (
      req.method === "GET" &&
      url.pathname === "/api/health"
    ) {
      return sendJson(res, 200, {
        ok: true,
        service: "magizh-cafe-test-final",
        status: "live",
        ttlDays: TTL_DAYS,
        serverTime: new Date().toISOString(),
        requestId
      });
    }

    if (
      req.method === "GET" &&
      url.pathname === "/api/state"
    ) {
      const store = readStore();
      const rawKeys = String(url.searchParams.get("keys") || "").trim();
      const keys = rawKeys
        ? rawKeys.split(",").map(x => x.trim()).filter(Boolean)
        : null;
      const state = keys
        ? Object.fromEntries(keys.map(k => [k, Object.prototype.hasOwnProperty.call(store.state, k) ? store.state[k] : null]))
        : store.state;

      return sendJson(res, 200, {
        ok: true,
        ttlDays: TTL_DAYS,
        updatedAt: store.updatedAt,
        expiresAt: store.expiresAt,
        state
      });
    }

    if (
      req.method === "PUT" &&
      url.pathname === "/api/state"
    ) {
      const body = await readBody(req);

      if (!body.key) {
        return sendJson(res, 400, {
          ok: false,
          error: "key required"
        });
      }

      const saved = await queuedStateWrite(state => {
        state[body.key] = body.value;
      });

      return sendJson(res, 200, {
        ok: true,
        key: body.key,
        updatedAt: saved.updatedAt,
        expiresAt: saved.expiresAt
      });
    }

    if (
      req.method === "POST" &&
      url.pathname === "/api/state/bulk"
    ) {
      const body = await readBody(req);

      if (
        !body.state ||
        typeof body.state !== "object" ||
        Array.isArray(body.state)
      ) {
        return sendJson(res, 400, {
          ok: false,
          error: "state object required"
        });
      }

      const saved = await queuedStateWrite(state => {
        Object.assign(state, body.state);
      });

      return sendJson(res, 200, {
        ok: true,
        updatedAt: saved.updatedAt,
        expiresAt: saved.expiresAt
      });
    }

    if (
      req.method === "POST" &&
      url.pathname === "/api/reset"
    ) {
      const saved = writeStore(DEFAULT_STATE);

      return sendJson(res, 200, {
        ok: true,
        message: "Temporary test data reset",
        ttlDays: TTL_DAYS,
        updatedAt: saved.updatedAt,
        expiresAt: saved.expiresAt
      });
    }

    if (
      req.method === "GET" &&
      (
        url.pathname === "/" ||
        url.pathname === "/index.html"
      )
    ) {
      return sendFile(
        res,
        "index.html",
        "text/html; charset=utf-8"
      );
    }

    if (
      req.method === "GET" &&
      (
        url.pathname === "/admin" ||
        url.pathname === "/admin/"
      )
    ) {
      return sendFile(
        res,
        "admin.html",
        "text/html; charset=utf-8"
      );
    }

    if (
      req.method === "GET" &&
      url.pathname === "/server-sync.js"
    ) {
      return sendFile(
        res,
        "server-sync.js",
        "text/javascript; charset=utf-8"
      );
    }

    if (
      req.method === "GET" &&
      url.pathname === "/favicon.ico"
    ) {
      res.writeHead(204);
      return res.end();
    }

    return sendJson(res, 404, {
      ok: false,
      error: "not found",
      requestId
    });

  } catch (error) {
    console.error(
      "[REQUEST_ERROR " + requestId + "]",
      error
    );

    return sendJson(
      res,
      error.statusCode || 500,
      {
        ok: false,
        error:
          error.statusCode
            ? error.message
            : "server error",
        requestId
      }
    );
  }
});

server.on(
  "error",
  error => console.error("[SERVER_ERROR]", error)
);

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "Magizh Cafe final test server listening on port " +
      PORT
    );

    console.log(
      "DATA_TTL_DAYS=" +
      TTL_DAYS
    );
  }
);
