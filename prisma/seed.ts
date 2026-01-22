import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const trader = await prisma.trader.upsert({
    where: { username: 'noble_trader' },
    update: {},
    create: {
      firstName: 'Noble', lastName: 'Trader', username: 'noble_trader',
      email: 'noble@trading.com', passwordHash: 'hash', roleLevel: 10,
    }
  })

  let currentCapital = 500
  
  for (let i = 1; i <= 100; i++) {
    // Pegamos a missão calculada para saber o lucro previsto e compor o capital do próximo dia
    const mission = (await import('../utils/tradingEngine')).calculateMission(currentCapital)
    const expectedProfit = mission.targetProfit

    await prisma.tradingDay.upsert({
      where: { traderId_linha: { traderId: trader.id, linha: i } },
      update: { capital: currentCapital },
      create: {
        traderId: trader.id,
        linha: i,
        capital: currentCapital,
        lucroLiq: 0,
        completado: false
      }
    })
    
    // O capital do dia seguinte é o capital de hoje + o lucro que o plano manda buscar
    currentCapital += expectedProfit
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())