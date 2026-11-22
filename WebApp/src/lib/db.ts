import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Serverless Postgres (Neon) closes idle connections and sometimes drops a new one mid-handshake. Those errors say nothing
 *  about the query itself, so it is safe to try again. Real errors (constraint violations, bad input) are not retried. */
const CONNECTION_ERROR =
  /socket disconnected|Connection terminated|ECONNRESET|ETIMEDOUT|ECONNREFUSED|timeout exceeded when trying to connect|Can't reach database server|Server has closed the connection|connection.*(closed|reset)|P1001|P1002|P1017/i;

function makeClient() {
  const base = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000, // drop idle connections before Neon does
      connectionTimeoutMillis: 40_000, // a Neon database waking from idle can take 20s+ to accept the first connection
      keepAlive: true,
    }),
  });
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            if (attempt >= 4 || !CONNECTION_ERROR.test(String((e as Error)?.message ?? e))) throw e;
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof makeClient> };

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
