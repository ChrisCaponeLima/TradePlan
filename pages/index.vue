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
  
  // 1. Registro dos componentes (Padrão Chart.js para Vue)
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)
  
  // 2. Fetch de dados (Nuxt composable)
  const { data: plan, pending, refresh } = await useFetch('/api/trading-plan')
  
  const formatCurrency = (val) => {
    if (val === undefined || val === null) val = 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }
  
  // 3. Lógica Reativa (Vue Computed)
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
  
  // 4. Configuração do Gráfico (Computada para reagir a mudanças na tabela)
  const chartData = computed(() => {
    if (!plan.value) return { labels: [], datasets: [] }
    
    const concluidos = plan.value.filter(d => d.completado)
    const dataPoints = [500, ...concluidos.map(d => d.totalAcum)]
    const labels = ['Início', ...concluidos.map(d => `D${d.linha}`)]
  
    return {
      labels,
      datasets: [{
        label: 'Capital',
        data: dataPoints,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.4, // Curva suave (bezier)
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 6
      }]
    }
  })
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161b22',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 12,
        displayColors: false
      }
    },
    scales: {
      y: { 
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#6b7280', font: { family: 'monospace' } }
      },
      x: { 
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 10 } }
      }
    }
  }
  
  const nextDayId = computed(() => plan.value?.find(d => !d.completado)?.id)
  
  const saveDayDetails = async (day) => {
    try {
      await $fetch('/api/trading-plan/update', {
        method: 'POST',
        body: { id: day.id, sentimento: day.sentimento, notas: day.notas, completado: day.completado }
      })
      // Refresh opcional se quiser que o gráfico atualize imediatamente após marcar o checkbox
    } catch (e) { console.error(e) }
  }
  </script>
  
  <template>
    <div class="min-h-screen bg-[#0b0e14] text-gray-200 p-4 md:p-8 font-sans">
      
      <div v-if="pending" class="flex flex-col items-center justify-center h-64 text-green-500 font-mono">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500 mb-4"></div>
        <p class="animate-pulse">CARREGANDO ENGINE...</p>
      </div>
  
      <div v-else class="max-w-7xl mx-auto">
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between h-40">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Win Rate</p>
                <p class="text-3xl font-mono text-green-400 mt-1">{{ stats.winRate.toFixed(1) }}%</p>
              </div>
              <div class="bg-green-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div class="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
              <div class="bg-green-500 h-full transition-all duration-700" :style="{ width: stats.winRate + '%' }"></div>
            </div>
          </div>
          
          <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between h-40">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Equity Total</p>
                <p class="text-3xl font-mono text-blue-400 mt-1">{{ formatCurrency(stats.totalProfit) }}</p>
              </div>
              <div class="bg-blue-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-blue-400"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <p class="text-[9px] text-gray-600 font-mono tracking-tighter">DATA SOURCE: NEON DB</p>
          </div>
  
          <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between h-40">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Drawdown</p>
                <p class="text-3xl font-mono text-red-400 mt-1">{{ stats.drawdown }}%</p>
              </div>
              <div class="bg-red-500/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-red-400"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full" :class="Number(stats.drawdown) > 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'"></div>
              <span class="text-[10px] font-bold text-gray-500 uppercase">{{ Number(stats.drawdown) > 5 ? 'Risco Elevado' : 'Seguro' }}</span>
            </div>
          </div>
        </div>
  
        <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-lg mb-8">
          <h3 class="text-[10px] font-bold text-gray-500 uppercase mb-6 tracking-[0.3em]">Curva de Capital Acumulado</h3>
          <div class="h-64 md:h-80">
            <ClientOnly>
              <Line :data="chartData" :options="chartOptions" />
              <template #fallback>
                <div class="flex items-center justify-center h-full text-gray-700 font-mono text-xs uppercase tracking-widest">
                  Renderizando Gráfico...
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
  
        <div class="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-lg mb-8">
          <h3 class="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-[0.3em]">Consistência Diária</h3>
          <div class="flex flex-wrap gap-2">
            <div v-for="day in plan" :key="day.id" 
                 class="w-4 h-4 rounded-sm transition-all duration-300 border border-transparent"
                 :class="[
                   day.completado ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-[#21262d]',
                   day.id === nextDayId ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0e14] animate-pulse' : ''
                 ]">
            </div>
          </div>
        </div>
  
        <div class="bg-[#161b22] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-[#0d1117] text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th class="p-4 text-center w-16 border-r border-gray-800/50">OK</th>
                  <th class="p-4 text-left w-20">Dia</th>
                  <th class="p-4 text-left">Capital</th>
                  <th class="p-4 text-left">Sentimento</th>
                  <th class="p-4 text-left">Notas</th>
                  <th class="p-4 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                <tr v-for="day in plan" :key="day.id" 
                    class="transition-colors"
                    :class="[
                      day.completado ? 'bg-green-500/[0.01] opacity-60' : '',
                      day.id === nextDayId ? 'bg-blue-500/[0.05] border-l-4 border-l-blue-500' : ''
                    ]">
                  <td class="p-4 text-center border-r border-gray-800/50">
                    <input type="checkbox" v-model="day.completado" @change="saveDayDetails(day)" class="accent-green-500 w-4 h-4 cursor-pointer" />
                  </td>
                  <td class="p-4 font-mono text-gray-500 text-xs">{{ String(day.linha).padStart(3, '0') }}</td>
                  <td class="p-4 font-mono text-xs text-gray-400">{{ formatCurrency(day.capital) }}</td>
                  <td class="p-4">
                    <select v-model="day.sentimento" @change="saveDayDetails(day)" class="bg-[#0b0e14] border border-gray-800 rounded px-2 py-1 text-[10px] w-full outline-none">
                      <option :value="null">--</option>
                      <option value="Calmo">😌 CALMO</option>
                      <option value="Ansioso">😰 ANSIOSO</option>
                      <option value="Eufórico">🚀 EUFÓRICO</option>
                    </select>
                  </td>
                  <td class="p-4">
                    <input v-model="day.notas" @blur="saveDayDetails(day)" placeholder="..." class="bg-transparent border-b border-gray-800 text-[11px] w-full outline-none py-1 text-gray-300" />
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