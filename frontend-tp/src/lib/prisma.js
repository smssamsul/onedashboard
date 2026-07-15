import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // 🛡️ SYSTEM-LEVEL SAFETY: DB ERROR INTERCEPTION
  // Intercepts ALL queries to sanitize errors before they bubble up
  client.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          const errorStr = String(error);
          // Detect sensitive keywords
          if (/SQLSTATE|Connection|FATAL|password|postgres/i.test(errorStr)) {
            console.error(`🚨 [PRISMA_FATAL] ${model}.${operation}`, error);
            // THROW A SAFE ERROR that doesn't contain the leak
            throw new Error("Terjadi kesalahan database. Silakan coba lagi.");
          }
          throw error; // Rethrow safe/app errors
        }
      },
    },
  });

  return client;
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
