// server/api/trading-plan/index.get.ts
import { calculateMission } from '~/utils/tradingEngine'

export default defineEventHandler(async (event) => {
  const days = await prisma.tradingDay.findMany({
    where: { traderId: 'id-do-trader' },
    orderBy: { linha: 'asc' }
  })

  return days.map(day => {
    const mission = calculateMission(day.capital)
    return {
      ...day,
      // Injetamos o plano que o usuário DEVE seguir
      planoContratos: mission.suggestedContracts,
      planoMeta: mission.targetProfit,
      planoPtsPerOp: mission.pointsPerOp,
      planoTotalPts: mission.totalPointsNeeded,
      // Calculamos performance real comparada ao plano
      gainPercent: ((day.lucroLiq / day.capital) * 100).toFixed(2)
    }
  })
})