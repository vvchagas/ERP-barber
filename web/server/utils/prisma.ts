import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatabaseConnectionString(): string | undefined {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;

  try {
    const databaseUrl = new URL(connectionString);
    const sslMode = databaseUrl.searchParams.get("sslmode");
    if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
      databaseUrl.searchParams.set("sslmode", "verify-full");
    }
    return databaseUrl.toString();
  } catch {
    return connectionString;
  }
}

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: getDatabaseConnectionString(),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
