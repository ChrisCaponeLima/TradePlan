import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id, completado, sentimento, notas } = body

  return await prisma.tradingDay.update({
    where: { id: Number(id) },
    data: { 
      completado,
      sentimento,
      notas,
      dataExecucao: completado ? new Date() : null 
    }
  })
})