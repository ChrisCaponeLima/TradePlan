<script setup>
    defineProps(['plan', 'nextDayId'])
    </script>
    <template>
      <div class="bg-[#161b22] p-4 rounded-xl border border-gray-800">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Calendário de Consistência</h3>
          <span class="text-[8px] text-gray-700 font-mono">{{ plan?.filter(d => d.completado).length }}/100</span>
        </div>
        <div class="flex flex-wrap gap-1.5 justify-start">
          <div v-for="day in plan" :key="day.id" 
               class="w-2.5 h-2.5 md:w-4 md:h-4 rounded-[1px] transition-all"
               :class="[
                 day.completado ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-[#21262d]',
                 day.id === nextDayId ? 'ring-1 ring-blue-500 animate-pulse scale-110' : ''
               ]">
          </div>
        </div>
      </div>
    </template>