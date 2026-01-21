import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const initialCapital = 500
  let currentTotal = initialCapital
  
  // Constantes do Plano
  const dailyProfitLimit = 1000 // Teto de lucro (Linha 32+)
  const maxContracts = 21       // Teto de contratos
  const costPerContOp = 0.25    // Custo B3 por contrato/operação
  const opsDia = 5              // Quantidade fixa de operações/dia

  console.log('🚀 Iniciando geração do plano de 100 dias no Neon...')

  for (let i = 1; i <= 100; i++) {
    // 1. Definição da Meta Líquida (10% ou Teto de 1000)
    let metaLiq = currentTotal * 0.10
    if (metaLiq > dailyProfitLimit) metaLiq = dailyProfitLimit

    // 2. Definição de Contratos (1 para cada R$ 500, limitado ao teto)
    let contracts = Math.ceil(currentTotal / 500)
    if (contracts > maxContracts) contracts = maxContracts
    if (contracts < 2) contracts = 2 // Mínimo de 2 contratos para viabilizar custos

    // 3. Cálculo de Pontos Necessários
    // Fórmula: LucroLiq = (Contratos * PontosTotais * 0.20) - (Contratos * Ops * Custo)
    // Isolando Pontos: PontosTotais = (MetaLiq + Custos) / (Contratos * 0.20)
    const custosDia = contracts * opsDia * costPerContOp
    const totalPointsNeeded = Math.ceil((metaLiq + custosDia) / (contracts * 0.20))
    
    // Pontos por operação (baseado em 5 entradas)
    const ptsPerOp = Math.ceil(totalPointsNeeded / opsDia)
    
    // Lucro Líquido Real (pode variar levemente devido aos arredondamentos de pontos)
    const lucReal = (contracts * totalPointsNeeded * 0.20) - custosDia
    const totalAcum = currentTotal + lucReal

    // 4. Inserção ou Atualização no Banco de Dados
    await prisma.tradingDay.upsert({
      where: { linha: i },
      update: {
        capital: currentTotal,
        metaLiq: metaLiq,
        contratos: contracts,
        ptsPorOp: ptsPerOp,
        opsPorDia: opsDia,
        totalPts: totalPointsNeeded,
        lucroLiq: lucReal,
        gainDiario: (lucReal / currentTotal) * 100,
        incTotal: ((totalAcum - initialCapital) / initialCapital) * 100,
        totalAcum: totalAcum,
      },
      create: {
        linha: i,
        capital: currentTotal,
        metaLiq: metaLiq,
        contratos: contracts,
        ptsPorOp: ptsPerOp,
        opsPorDia: opsDia,
        totalPts: totalPointsNeeded,
        lucroLiq: lucReal,
        gainDiario: (lucReal / currentTotal) * 100,
        incTotal: ((totalAcum - initialCapital) / initialCapital) * 100,
        totalAcum: totalAcum,
        completado: false,
      }
    })

    // Atualiza o capital para a próxima linha
    currentTotal = totalAcum
  }

  console.log('✅ Plano de 100 dias gerado com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })