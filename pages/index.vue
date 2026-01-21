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
  
  const formatCurrency = (val) => {
    if (val === undefined || val === null) val = 0;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0 // Compactar para caber no mobile
    }).format(val)
  }
  
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
      drawdown: drawdown.toFixed(1)
    }
  })
  
  const chartData = computed(() => {
    if (!plan.value) return { labels: [], datasets: [] }
    const concluidos = plan.value.filter(d => d.completado)
    const dataPoints = [500, ...concluidos.map(d => d.totalAcum)]
    const labels = ['0', ...concluidos.map(d => `${d.linha}`)]
  
    return {
      labels,
      datasets: [{
        data: dataPoints,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1.5,
        tension: 0.3,
        fill: true,
        pointRadius: 0 // Remove pontos para limpar o gráfico no mobile
      }]
    }
  })
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { display: false }, // Esconde escala Y no mobile para ganhar espaço
      x: { ticks: { display: false }, grid: { display: false } }
    }
  }
  
  const nextDayId = computed(() => plan.value?.find(d => !d.completado)?.id)
  
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
    <div class="min-h-screen bg-[#0b0e14] text-gray-200 p-3 md:p-8 font-sans">
      
      <div v-if="pending" class="flex flex-col items-center justify-center h-64 text-green-500 font-mono text-[10px]">
        <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-green-500 mb-2"></div>
        <p>SYNCING...</p>
      </div>
  
      <div v-else class="max-w-7xl mx-auto space-y-4">
        
        <div class="grid grid-cols-3 gap-2 md:gap-6">
          <div class="bg-[#161b22] p-3 md:p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col justify-center items-center text-center">
            <p class="text-gray-500 text-[8px] md:text-[10px] font-bold uppercase tracking-tighter md:tracking-widest">Win Rate</p>
            <p class="text-sm md:text-3xl font-mono text-green-400 font-bold">{{ stats.winRate.toFixed(0) }}%</p>
            <div class="hidden md:block w-full bg-gray-800 h-1 rounded-full mt-2">
              <div class="bg-green-500 h-full transition-all" :style="{ width: stats.winRate + '%' }"></div>
            </div>
          </div>
          
          <div class="bg-[#161b22] p-3 md:p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col justify-center items-center text-center">
            <p class="text-gray-500 text-[8px] md:text-[10px] font-bold uppercase tracking-tighter md:tracking-widest">Equity</p>
            <p class="text-sm md:text-3xl font-mono text-blue-400 font-bold">{{ formatCurrency(stats.totalProfit) }}</p>
            <p class="text-[7px] text-gray-600 font-mono hidden md:block">NEON LIVE</p>
          </div>
  
          <div class="bg-[#161b22] p-3 md:p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col justify-center items-center text-center">
            <p class="text-gray-500 text-[8px] md:text-[10px] font-bold uppercase tracking-tighter md:tracking-widest">Drawdown</p>
            <p class="text-sm md:text-3xl font-mono text-red-400 font-bold">{{ stats.drawdown }}%</p>
            <div class="h-1 w-full bg-gray-800 mt-2 rounded-full overflow-hidden hidden md:block">
              <div class="bg-red-500 h-full" :style="{ width: stats.drawdown + '%' }"></div>
            </div>
          </div>
        </div>
  
        <div class="bg-[#161b22] p-3 md:p-6 rounded-xl border border-gray-800">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Performance Curve</h3>
          </div>
          <div class="h-32 md:h-64">
            <ClientOnly>
              <Line :data="chartData" :options="chartOptions" />
            </ClientOnly>
          </div>
        </div>
  
        <div class="bg-[#161b22] p-3 md:p-6 rounded-xl border border-gray-800">
          <h3 class="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">100 Days Progress</h3>
          <div class="flex flex-wrap gap-1 md:gap-2">
            <div v-for="day in plan" :key="day.id" 
                 class="w-2.5 h-2.5 md:w-4 md:h-4 rounded-[1px] transition-all"
                 :class="[
                   day.completado ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.3)]' : 'bg-[#21262d]',
                   day.id === nextDayId ? 'ring-1 ring-blue-500 animate-pulse' : ''
                 ]">
            </div>
          </div>
        </div>
  
        <div class="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-[10px] md:text-sm">
              <thead class="bg-[#0d1117] text-gray-500 uppercase text-[8px] md:text-[10px] font-bold">
                <tr>
                  <th class="p-3 text-center border-r border-gray-800/50">OK</th>
                  <th class="p-3 text-left">Dia</th>
                  <th class="p-3 text-left">Capital</th>
                  <th class="p-3 text-left min-w-[100px]">Sentimento</th>
                  <th class="p-3 text-left min-w-[150px]">Notas</th>
                  <th class="p-3 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                <tr v-for="day in plan" :key="day.id" 
                    class="transition-colors"
                    :class="[
                      day.completado ? 'bg-green-500/[0.01] opacity-60' : '',
                      day.id === nextDayId ? 'bg-blue-500/[0.05] border-l-2 border-l-blue-500' : ''
                    ]">
                  <td class="p-3 text-center border-r border-gray-800/50">
                    <input type="checkbox" v-model="day.completado" @change="saveDayDetails(day)" class="accent-green-500 w-3 h-3" />
                  </td>
                  <td class="p-3 font-mono text-gray-500">{{ String(day.linha).padStart(2, '0') }}</td>
                  <td class="p-3 font-mono text-gray-400">{{ formatCurrency(day.capital) }}</td>
                  <td class="p-3">
                    <select v-model="day.sentimento" @change="saveDayDetails(day)" class="bg-[#0b0e14] border border-gray-800 rounded px-1 py-1 text-[8px] md:text-[10px] w-full outline-none">
                      <option :value="null">--</option>
                      <option value="Calmo">😌</option>
                      <option value="Ansioso">😰</option>
                      <option value="Eufórico">🚀</option>
                    </select>
                  </td>
                  <td class="p-3">
                    <input v-model="day.notas" @blur="saveDayDetails(day)" class="bg-transparent border-b border-gray-800 text-[9px] md:text-[11px] w-full outline-none py-1 text-gray-300" />
                  </td>
                  <td class="p-3 text-right font-mono font-bold" :class="day.lucroLiq > 0 ? 'text-green-400' : 'text-red-400'">
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
    /* Esconde a barra de scroll mas mantém funcionalidade */
    .overflow-x-auto {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .overflow-x-auto::-webkit-scrollbar {
      display: none;
    }
  </style>