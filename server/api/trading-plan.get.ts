import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    // Busca todos os dias do plano ordenados pela linha
    const plan = await prisma.tradingDay.findMany({
      orderBy: {
        linha: 'asc'
      }
    })
    return plan
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao conectar com o Neon/Prisma'
    })
  }
})