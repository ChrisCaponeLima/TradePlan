<script setup>
    import { Line } from 'vue-chartjs'
    import { 
      Chart as ChartJS, 
      CategoryScale, 
      LinearScale, 
      PointElement, 
      LineElement, 
      Tooltip, 
      Filler 
    } from 'chart.js'
    
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)
    
    const props = defineProps(['plan'])
    
    const chartData = computed(() => {
      if (!props.plan) return { labels: [], datasets: [] }
      const concluidos = props.plan.filter(d => d.completado)
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
      scales: { 
        y: { display: false }, 
        x: { display: false } 
      }
    }
    </script>
    
    <template>
      <div class="h-full w-full">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </template>