<script setup>
  // Busca dos dados do plano via API
  const { data: plan, pending, error, refresh } = await useFetch('/api/trading-plan')
  
  // Formatação de Moeda
  const formatCurrency = (val) => {
    if (val === undefined || val === null) val = 0;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(val)
  }

  // Cálculos de Performance
  const stats = computed(() => {
    if (!plan.value || plan.value.length === 0) return { winRate: 0, drawdown: 0, totalProfit: 0 }
    
    const concluidos = plan.value.filter(d => d.completado)
    const gains = concluidos.filter(d => d.lucroLiq > 0).length
    const totalProfit = concluidos.reduce((acc, curr) => acc + curr.lucroLiq, 0)
    
    const capitalHistory = concluidos.map(d => d.totalAcum)
    const peak = Math.max(500, ...capitalHistory)
    const current = capitalHistory.length > 0 ? capitalHistory[capitalHistory.length - 1] : 500
    const drawdown = peak > 0 ? ((peak - current) / peak) * 100 : 0
  
    return {
      winRate: concluidos.length > 0 ? (gains / concluidos.length) * 100 : 0,
      totalProfit,
      drawdown: drawdown.toFixed(2)
    }
  })

  // Identificar qual é o próximo dia a ser operado
  const nextDayId = computed(() => {
    return plan.value?.find(d => !d.completado)?.id
  })
  
  // Persistência no Banco Neon
  const saveDayDetails = async (day) => {
    try {
      await $fetch('/api/trading-plan/update', {
        method: 'POST',
        body: { 
          id: day.id, 
          sentimento: day.sentimento, 
          notas: day.notas,
          completado: day.completado 
        }
      })
    } catch (e) {
      console.error("Erro ao salvar no Neon:", e)
    }
  }
</script>

<template>
  <div class="min-h-screen bg-[#0b0e14] text-gray-200 p-4 md:p-8 font-sans">
    
    <div v-if="pending" class="flex flex-col items-center justify-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
      <p class="text-gray-500 animate-pulse font-mono text-xs uppercase tracking-widest">Sincronizando Banco Neon...</p>
    </div>

    <div v-else class="max-w-7xl mx-auto">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between h-40 group hover:border-green-500/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Taxa de Acerto</p>
              <p class="text-3xl font-mono text-green-400 mt-1">{{ stats.winRate.toFixed(1) }}%</p>
            </div>
            <div class="bg-green-500/10 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>
          <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div class="bg-green-500 h-full transition-all duration-1000" :style="{ width: stats.winRate + '%' }"></div>
          </div>
        </div>
        
        <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between h-40 group hover:border-blue-500/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Saldo Líquido</p>
              <p class="text-3xl font-mono text-blue-400 mt-1">{{ formatCurrency(stats.totalProfit) }}</p>
            </div>
            <div class="bg-blue-500/10 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-blue-400"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <p class="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">Conexão Ativa</p>
          </div>
        </div>

        <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between h-40 group hover:border-red-500/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Rebaixamento</p>
              <p class="text-3xl font-mono text-red-400 mt-1">{{ stats.drawdown }}%</p>
            </div>
            <div class="bg-red-500/10 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-red-400"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            </div>
          </div>
          <div class="flex items-center justify-between bg-[#0b0e14] px-3 py-1 rounded-full border border-gray-800">
            <p class="text-[9px] text-gray-500 uppercase font-black">Risco</p>
            <span class="text-[9px] font-black uppercase" :class="Number(stats.drawdown) > 5 ? 'text-red-500' : 'text-green-500'">
              {{ Number(stats.drawdown) > 5 ? '⚠️ ATENÇÃO' : '✅ CONTROLADO' }}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-lg mb-8">
        <h3 class="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-[0.3em]">Jornada dos 100 Dias</h3>
        <div class="flex flex-wrap gap-2">
          <div v-for="day in plan" :key="day.id" 
               class="w-4 h-4 rounded-sm transition-all duration-300 border border-transparent"
               :class="[
                 day.completado ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'bg-[#21262d]',
                 day.id === nextDayId ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0e14] animate-pulse' : ''
               ]"
               :title="'Dia ' + day.linha">
          </div>
        </div>
      </div>

      <div class="bg-[#161b22] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-[#0d1117] text-gray-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th class="p-4 text-center w-16 border-r border-gray-800/50">Fim</th>
                <th class="p-4 text-left w-20">Dia</th>
                <th class="p-4 text-left">Capital</th>
                <th class="p-4 text-left w-44">Sentimento</th>
                <th class="p-4 text-left">Notas do Trade</th>
                <th class="p-4 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              <tr v-for="day in plan" :key="day.id" 
                  class="transition-colors"
                  :class="[
                    day.completado ? 'bg-green-500/[0.02] opacity-60' : '',
                    day.id === nextDayId ? 'bg-blue-500/[0.05] border-l-4 border-l-blue-500' : ''
                  ]">
                
                <td class="p-4 text-center border-r border-gray-800/50">
                  <input type="checkbox" v-model="day.completado" @change="saveDayDetails(day)" class="accent-green-500 w-4 h-4 cursor-pointer" />
                </td>
                <td class="p-4 font-mono text-gray-500 text-xs">{{ String(day.linha).padStart(3, '0') }}</td>
                <td class="p-4 font-mono text-xs text-gray-400">{{ formatCurrency(day.capital) }}</td>
                <td class="p-4">
                  <select v-model="day.sentimento" @change="saveDayDetails(day)" class="bg-[#0b0e14] border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] w-full focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                    <option :value="null">-- SELECIONE --</option>
                    <option value="Calmo">😌 FOCO TOTAL</option>
                    <option value="Ansioso">😰 ANSIEDADE</option>
                    <option value="Eufórico">🚀 EUFORIA</option>
                    <option value="Medo">😨 HESITAÇÃO</option>
                  </select>
                </td>
                <td class="p-4">
                  <input v-model="day.notas" @blur="saveDayDetails(day)" placeholder="Setup, erros ou lições..." class="bg-transparent border-b border-gray-800 text-[11px] w-full focus:border-blue-500 outline-none py-1 text-gray-300 placeholder:text-gray-700 transition-colors" />
                </td>
                <td class="p-4 text-right font-mono font-bold text-xs" :class="day.lucroLiq > 0 ? 'text-green-400' : 'text-red-400'">
                  {{ formatCurrency(day.lucroLiq) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>