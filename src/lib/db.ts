import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logConfig = process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: logConfig as never,
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
