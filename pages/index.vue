<script setup>
  import { Line } from 'vue-chartjs'
  import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend, 
    Filler 
  } from 'chart.js'
  
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)
  
  const { data: plan, pending } = await useFetch('/api/trading-plan')
  
  // Configurações do Plano (Exemplo Noble Standard)
  const planConfig = {
    contratosBase: 2,
    pontosMeta: 300,
    taxaCorretagem: 1.10,
    expectativaMatematica: "1.5R"
  }
  
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0 
    }).format(val || 0)
  }
  
  // Dia Atual para Operar
  const currentDay = computed(() => {
    return plan.value?.find(d => !d.completado) || plan.value?.[0]
  })
  
  const stats = computed(() => {
    if (!plan.value?.length) return { winRate: 0, drawdown: 0, totalProfit: 0 }
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
      drawdown: drawdown.toFixed(1)
    }
  })
  
  // Gráfico simplificado para Mobile
  const chartData = computed(() => {
    if (!plan.value) return { labels: [], datasets: [] }
    const concluidos = plan.value.filter(d => d.completado)
    return {
      labels: ['0', ...concluidos.map(d => d.linha)],
      datasets: [{
        data: [500, ...concluidos.map(d => d.totalAcum)],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 1.5,
        tension: 0.4,
        fill: true,
        pointRadius: 0
      }]
    }
  })
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { display: false }, x: { display: false } }
  }
  
  const saveDayDetails = async (day) => {
    try {
      await $fetch('/api/trading-plan/update', {
        method: 'POST',
        body: { id: day.id, sentimento: day.sentimento, notas: day.notas, completado: day.completado }
      })
    } catch (e) { console.error(e) }
  }
  </script>
  
  <template>
    <div class="min-h-screen bg-[#0b0e14] text-gray-200 p-3 md:p-8 font-sans selection:bg-green-500/30">
      
      <div v-if="pending" class="flex items-center justify-center h-screen font-mono text-xs text-green-500">
        <span class="animate-pulse">LOADING TERMINAL...</span>
      </div>
  
      <div v-else class="max-w-4xl mx-auto space-y-4 pb-20">
        
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800 text-center">
            <p class="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Win Rate</p>
            <p class="text-sm font-mono text-green-400 font-bold">{{ stats.winRate.toFixed(0) }}%</p>
          </div>
          <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800 text-center">
            <p class="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Equity</p>
            <p class="text-sm font-mono text-blue-400 font-bold">{{ formatCurrency(stats.totalProfit) }}</p>
          </div>
          <div class="bg-[#161b22] p-3 rounded-xl border border-gray-800 text-center">
            <p class="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Drawdown</p>
            <p class="text-sm font-mono text-red-400 font-bold">{{ stats.drawdown }}%</p>
          </div>
        </div>
  
        <div class="bg-gradient-to-br from-[#1c2128] to-[#161b22] p-5 rounded-2xl border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Plano do Dia: {{ currentDay?.linha }}</h2>
            <span class="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[9px] font-bold animate-pulse">LIVE</span>
          </div>
  
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <p class="text-[9px] text-gray-500 uppercase">Quantidade Contratos</p>
              <p class="text-xl font-mono font-bold">{{ planConfig.contratosBase }} <span class="text-[10px] text-gray-600">Mini</span></p>
            </div>
            <div class="space-y-1">
              <p class="text-[9px] text-gray-500 uppercase">Pontos por Contrato</p>
              <p class="text-xl font-mono font-bold">{{ planConfig.pontosMeta }} <span class="text-[10px] text-gray-600">PTS</span></p>
            </div>
            <div class="space-y-1">
              <p class="text-[9px] text-gray-500 uppercase">Expectativa Operação</p>
              <p class="text-xl font-mono font-bold text-blue-400">{{ planConfig.expectativaMatematica }}</p>
            </div>
            <div class="space-y-1">
              <p class="text-[9px] text-gray-500 uppercase">Capital Projetado</p>
              <p class="text-xl font-mono font-bold text-gray-300">{{ formatCurrency(currentDay?.capital) }}</p>
            </div>
          </div>
  
          <div class="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="currentDay.completado" @change="saveDayDetails(currentDay)" 
                     class="w-6 h-6 accent-green-500 rounded-lg cursor-pointer" />
              <span class="text-[10px] font-bold text-gray-400 uppercase">Concluir dia operacional</span>
            </div>
            <p class="text-[10px] font-mono text-gray-600">ALVO: {{ formatCurrency(currentDay?.capital + currentDay?.lucroLiq) }}</p>
          </div>
        </div>
  
        <div class="bg-[#161b22] p-4 rounded-xl border border-gray-800 h-40">
          <div class="h-full">
            <ClientOnly>
              <Line :data="chartData" :options="chartOptions" />
            </ClientOnly>
          </div>
        </div>
  
        <div class="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
          <div class="p-3 border-b border-gray-800 flex items-center justify-between">
            <h3 class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Journaling / Histórico</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-[10px]">
              <thead class="bg-[#0d1117] text-gray-600 uppercase font-bold">
                <tr>
                  <th class="p-3 text-left w-12">Dia</th>
                  <th class="p-3 text-left">Sentimento</th>
                  <th class="p-3 text-left">Notas</th>
                  <th class="p-3 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                <tr v-for="day in plan.slice().reverse()" :key="day.id" class="opacity-70 hover:opacity-100 transition-opacity">
                  <td class="p-3 font-mono text-gray-500">{{ day.linha }}</td>
                  <td class="p-3">
                    <select v-model="day.sentimento" @change="saveDayDetails(day)" class="bg-transparent text-[14px]">
                      <option :value="null">--</option>
                      <option value="Calmo">😌</option>
                      <option value="Ansioso">😰</option>
                      <option value="Eufórico">🚀</option>
                    </select>
                  </td>
                  <td class="p-3">
                    <input v-model="day.notas" @blur="saveDayDetails(day)" class="bg-transparent w-full border-b border-transparent focus:border-green-500 outline-none" />
                  </td>
                  <td class="p-3 text-right font-mono" :class="day.lucroLiq > 0 ? 'text-green-500' : 'text-red-500'">
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
  
  <style scoped>
    /* Scrollbar invisível mas funcional */
    .overflow-x-auto { scrollbar-width: none; }
    .overflow-x-auto::-webkit-scrollbar { display: none; }
    
    /* Melhora no touch para mobile */
    select, input { min-height: 24px; }
  </style>