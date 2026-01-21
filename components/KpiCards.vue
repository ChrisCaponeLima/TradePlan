<script setup>
    defineProps(['stats', 'formatCurrency'])
    </script>
    <template>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="(item, idx) in [
          { label: 'Win Rate', val: stats.winRate.toFixed(0) + '%', color: 'text-green-400', bar: stats.winRate, sub: 'Acerto Real' },
          { label: 'Equity', val: formatCurrency(stats.totalProfit), color: 'text-blue-400', sub: 'Neon Live', pulse: true },
          { label: 'Drawdown', val: stats.drawdown + '%', color: 'text-red-400', bar: stats.drawdown, sub: Number(stats.drawdown) > 5 ? '⚠️ Risco' : '✅ Seguro' }
        ]" :key="idx" class="bg-[#161b22] p-3 rounded-xl border border-gray-800 flex flex-col justify-between h-24 md:h-32">
          <div>
            <p class="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold tracking-widest">{{ item.label }}</p>
            <p class="text-sm md:text-2xl font-mono font-bold leading-tight" :class="item.color">{{ item.val }}</p>
          </div>
          <div class="space-y-1">
            <div v-if="item.bar !== undefined" class="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
              <div :class="item.color.replace('text', 'bg')" class="h-full transition-all duration-700" :style="{ width: item.bar + '%' }"></div>
            </div>
            <div class="flex items-center gap-1">
              <span v-if="item.pulse" class="h-1 w-1 rounded-full bg-blue-500 animate-pulse"></span>
              <p class="text-[7px] md:text-[9px] text-gray-600 uppercase font-medium">{{ item.sub }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>