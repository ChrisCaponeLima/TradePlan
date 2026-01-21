<script setup>
    defineProps(['currentDay', 'planConfig', 'formatCurrency'])
    defineEmits(['update'])
    </script>
    <template>
      <div class="bg-gradient-to-br from-[#1c2128] to-[#161b22] p-5 rounded-2xl border border-green-500/30 shadow-xl">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Missão Atual: Dia {{ currentDay?.linha }}</h2>
          <span class="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[9px] font-bold animate-pulse">ALVO ATIVO</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="info in [
            { label: 'Contratos', val: planConfig.contratosBase, unit: 'MINI' },
            { label: 'Meta Pontos', val: planConfig.pontosMeta, unit: 'PTS' },
            { label: 'Expectativa', val: planConfig.expectativaMatematica, color: 'text-blue-400' },
            { label: 'Capital Base', val: formatCurrency(currentDay?.capital) }
          ]" :key="info.label">
            <p class="text-[8px] text-gray-500 uppercase font-bold">{{ info.label }}</p>
            <p class="text-lg font-mono font-bold" :class="info.color">{{ info.val }} <span v-if="info.unit" class="text-[9px] text-gray-600 font-normal">{{ info.unit }}</span></p>
          </div>
        </div>
        <div class="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" v-model="currentDay.completado" @change="$emit('update', currentDay)" class="w-6 h-6 accent-green-500 rounded-lg" />
            <span class="text-[10px] font-bold text-gray-400 uppercase group-hover:text-green-500 transition-colors">Concluir Dia</span>
          </label>
          <p class="text-[10px] font-mono font-bold text-gray-600 italic">ALVO: {{ formatCurrency(currentDay?.capital + currentDay?.lucroLiq) }}</p>
        </div>
      </div>
    </template>