<script setup>
    const props = defineProps(['plan', 'formatCurrency'])
    defineEmits(['update'])
    
    // Inverte a lista para o Journaling (Recentes no topo)
    const reversedPlan = computed(() => {
      return props.plan ? [...props.plan].reverse() : []
    })
    </script>
    
    <template>
      <div class="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <div class="p-3 border-b border-gray-800 bg-[#0d1117] flex justify-between items-center">
          <h3 class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Journaling Operacional</h3>
          <span class="text-[8px] text-gray-700 uppercase">Histórico Reverso</span>
        </div>
        
        <div class="overflow-x-auto scroll-hide">
          <table class="w-full text-[10px]">
            <thead class="bg-[#0d1117] text-gray-600 uppercase font-bold border-b border-gray-800">
              <tr>
                <th class="p-3 text-left w-12 border-r border-gray-800">Dia</th>
                <th class="p-3 text-left w-14">Snt.</th>
                <th class="p-3 text-left">Notas / Insights</th>
                <th class="p-3 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              <tr v-for="day in reversedPlan" :key="day.id" 
                  class="transition-colors hover:bg-white/[0.01]"
                  :class="day.completado ? 'opacity-40' : 'bg-green-500/[0.03]'">
                <td class="p-3 font-mono text-gray-500 border-r border-gray-800">{{ day.linha }}</td>
                <td class="p-3">
                  <select v-model="day.sentimento" @change="$emit('update', day)" class="bg-transparent outline-none cursor-pointer">
                    <option :value="null">--</option>
                    <option value="Calmo">😌</option>
                    <option value="Ansioso">😰</option>
                    <option value="Eufórico">🚀</option>
                  </select>
                </td>
                <td class="p-3">
                  <input v-model="day.notas" @blur="$emit('update', day)" placeholder="Descreva o trade..." 
                         class="bg-transparent w-full outline-none focus:text-white placeholder:text-gray-700" />
                </td>
                <td class="p-3 text-right font-mono font-bold" :class="day.lucroLiq > 0 ? 'text-green-500' : 'text-red-500'">
                  {{ formatCurrency(day.lucroLiq) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    
    <style scoped>
    .scroll-hide {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .scroll-hide::-webkit-scrollbar {
      display: none;
    }
    </style>