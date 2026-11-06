import { barConfig, lineConfig } from '@/lib/admin/chart-builders';
import { doughnutConfig } from '@/lib/admin/chart-doughnut';
import type { ChartBuild, ChartSpec, ChartTheme } from '@/lib/admin/chart-theme';

export { compactMoney, moneyLabel } from '@/lib/admin/chart-theme';
export type {
  ChartBuild,
  ChartLegendItem,
  ChartSpec,
  ChartTheme,
} from '@/lib/admin/chart-theme';

/** Traduce la especificación neutral de un gráfico a configuración de Chart.js. */
export function buildChart(
  spec: ChartSpec,
  theme: ChartTheme,
  reducedMotion: boolean,
): ChartBuild {
  if (spec.kind === 'line') {
    return { config: lineConfig(spec, theme, reducedMotion), legend: null };
  }
  if (spec.kind === 'bar') {
    return { config: barConfig(spec, theme, reducedMotion), legend: null };
  }
  return doughnutConfig(spec, theme, reducedMotion);
}
