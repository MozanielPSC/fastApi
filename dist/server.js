"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/app.ts
var import_fastify = __toESM(require("fastify"));
var import_cookie = __toESM(require("@fastify/cookie"));

// src/routes/transactions.ts
var import_zod2 = require("zod");
var import_crypto = __toESM(require("crypto"));

// src/database.ts
var import_knex = require("knex");

// src/env/index.ts
var import_dotenv = require("dotenv");
var import_zod = require("zod");
if (process.env.NODE_ENV === "test") {
  (0, import_dotenv.config)({ path: ".env.test" });
} else {
  (0, import_dotenv.config)();
}
var envSchema = import_zod.z.object({
  NODE_ENV: import_zod.z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: import_zod.z.string(),
  PORT: import_zod.z.number().default(3333)
});
var tryEnv = envSchema.safeParse(process.env);
if (!tryEnv.success) {
  throw new Error(tryEnv.error.message);
}
var env = tryEnv.data;

// src/database.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}
var config2 = {
  client: "sqlite",
  connection: {
    filename: env.DATABASE_URL
  },
  useNullAsDefault: true,
  migrations: {
    extension: "ts",
    directory: "./db/migrations"
  }
};
var knex = (0, import_knex.knex)(config2);

// src/middlewares/checkSessionIdExists.ts
async function checkSessionIdExists(request, response) {
  const sessionId = request.cookies.sessionId;
  if (!sessionId) {
    return response.status(401).send(
      {
        error: "Unauthorized"
      }
    );
  }
}

// src/routes/transactions.ts
async function transactionsRoutes(app2) {
  app2.get(
    "/",
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      const { sessionId } = request.cookies;
      const transactions = await knex("transactions").where({ session_id: sessionId }).select("*");
      return response.status(200).send(transactions);
    }
  );
  app2.get(
    "/:id",
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      const getTransactionParamsSchema = import_zod2.z.object({
        id: import_zod2.z.string().uuid()
      });
      const { id } = getTransactionParamsSchema.parse(request.params);
      const transaction = await knex("transactions").select("*").where({ id }).andWhere({ session_id: request.cookies.sessionId }).first();
      if (!transaction) {
        return response.status(404).send();
      }
      return response.status(200).send(transaction);
    }
  );
  app2.post("/", async (request, response) => {
    const createTransactionBodySchema = import_zod2.z.object({
      title: import_zod2.z.string(),
      amount: import_zod2.z.number(),
      type: import_zod2.z.enum(["credit", "debit"])
    });
    const { title, amount, type } = createTransactionBodySchema.parse(request.body);
    let sessionId = request.cookies.sessionId;
    if (!sessionId) {
      sessionId = import_crypto.default.randomUUID();
      response.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 1e3 * 60 * 60 * 24 * 7
        // 7 days
      });
    }
    await knex("transactions").insert({
      id: import_crypto.default.randomUUID(),
      title,
      amount: type === "credit" ? amount : -amount,
      session_id: sessionId
    });
    return response.status(201).send();
  });
  app2.get(
    "/summary",
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      const summary = await knex("transactions").sum("amount", { as: "amount" }).first();
      return response.status(200).send({ summary });
    }
  );
}

// src/app.ts
var app = (0, import_fastify.default)();
app.register(import_cookie.default);
app.register(transactionsRoutes, {
  prefix: "/transactions"
});

// src/server.ts
app.listen({
  port: env.PORT
}).then(() => {
  console.log("Server is running on port 3333");
});
