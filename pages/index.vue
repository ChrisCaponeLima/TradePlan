<script setup>
  // Imports lógicos permanecem aqui
  const { data: plan, pending } = await useFetch('/api/trading-plan')
  
  const planConfig = {
    contratosBase: 2,
    pontosMeta: 300,
    expectativaMatematica: "1.5R"
  }
  
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0)
  
  const stats = computed(() => {
    if (!plan.value?.length) return { winRate: 0, drawdown: 0, totalProfit: 0 }
    const concluidos = plan.value.filter(d => d.completado)
    const gains = concluidos.filter(d => d.lucroLiq > 0).length
    const totalProfit = concluidos.reduce((acc, curr) => acc + curr.lucroLiq, 0)
    const peak = Math.max(500, ...concluidos.map(d => d.totalAcum))
    const current = concluidos.length > 0 ? concluidos[concluidos.length - 1].totalAcum : 500
    return {
      winRate: concluidos.length > 0 ? (gains / concluidos.length) * 100 : 0,
      totalProfit,
      drawdown: peak > 0 ? (((peak - current) / peak) * 100).toFixed(1) : 0
    }
  })
  
  const currentDay = computed(() => plan.value?.find(d => !d.completado) || plan.value?.[0])
  const nextDayId = computed(() => currentDay.value?.id)
  
  const handleUpdate = async (day) => {
    await $fetch('/api/trading-plan/update', { method: 'POST', body: day })
  }
  </script>
  
  <template>
    <div class="min-h-screen bg-[#0b0e14] text-gray-200 p-3 md:p-8">
      <div v-if="pending" class="flex items-center justify-center h-screen font-mono text-green-500">
        <span class="animate-pulse italic">MODULAR_BOOT_SEQUENCE...</span>
      </div>
  
      <div v-else class="max-w-4xl mx-auto space-y-6 pb-20">
        <KpiCards :stats="stats" :formatCurrency="formatCurrency" />
        
        <MissionControl :currentDay="currentDay" :planConfig="planConfig" :formatCurrency="formatCurrency" @update="handleUpdate" />
  
        <div class="bg-[#161b22] p-4 rounded-xl border border-gray-800 h-40">
          <ClientOnly>
            <PerformanceChart :plan="plan" />
          </ClientOnly>
        </div>
  
        <PerformanceHeatmap :plan="plan" :nextDayId="nextDayId" />
  
        <TradingJournal :plan="plan" :formatCurrency="formatCurrency" @update="handleUpdate" />
      </div>
    </div>
  </template>