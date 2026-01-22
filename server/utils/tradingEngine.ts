// utils/tradingEngine.ts

export const NOBEL_RULES = {
  profitTargetPercent: 0.10,
  maxDailyProfit: 1000,
  capitalPerContract: 500,
  maxContracts: 21,
  minContracts: 2,
  opsPerDay: 5,
  pointValue: 0.20,
  costPerContOp: 0.25,
  initialCapital: 500
}

export const calculateMission = (currentCapital: number) => {
  // 1. Meta Financeira (10% limitado a 1000)
  const targetProfit = Math.min(currentCapital * NOBEL_RULES.profitTargetPercent, NOBEL_RULES.maxDailyProfit)

  // 2. Contratos (1 para cada 500, min 2, max 21)
  const suggestedContracts = Math.min(
    Math.max(Math.ceil(currentCapital / NOBEL_RULES.capitalPerContract), NOBEL_RULES.minContracts),
    NOBEL_RULES.maxContracts
  )

  // 3. Matemática de Pontos para cobrir Meta + Custos B3
  const dailyCosts = suggestedContracts * NOBEL_RULES.opsPerDay * NOBEL_RULES.costPerContOp
  const totalPointsNeeded = Math.ceil((targetProfit + dailyCosts) / (suggestedContracts * NOBEL_RULES.pointValue))
  
  // 4. Pontos por operação (Baseado na regra de no máximo 5 ops)
  const pointsPerOp = Math.ceil(totalPointsNeeded / NOBEL_RULES.opsPerDay)

  return {
    targetProfit,
    suggestedContracts,
    pointsPerOp,
    totalPointsNeeded,
    dailyCosts,
    isSafe: pointsPerOp <= 50 // Alerta se a estratégia exigir mais que 50 pts/op
  }
}