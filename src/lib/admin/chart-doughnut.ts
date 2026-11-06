import type { ChartConfiguration, Plugin } from 'chart.js';
import {
  baseOptions,
  formatValue,
  type ChartBuild,
  type ChartSpec,
  type ChartTheme,
} from '@/lib/admin/chart-theme';

function centerTextPlugin(value: string, label: string, theme: ChartTheme): Plugin<'doughnut'> {
  return {
    id: 'rep-center-text',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.ink;
      ctx.font = '650 17px Inter, system-ui, sans-serif';
      ctx.fillText(value, x, y - 7);
      ctx.fillStyle = theme.muted;
      ctx.font = '600 9px Inter, system-ui, sans-serif';
      ctx.fillText(label.toUpperCase(), x, y + 12);
      ctx.restore();
    },
  };
}

export function doughnutConfig(
  spec: Extract<ChartSpec, { kind: 'doughnut' }>,
  theme: ChartTheme,
  reducedMotion: boolean,
): ChartBuild {
  const total = spec.values.reduce((sum, value) => sum + value, 0);
  const options = baseOptions(theme, reducedMotion);
  const config: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels: spec.labels,
      datasets: [
        {
          data: spec.values,
          backgroundColor: theme.palette,
          borderWidth: 0,
          spacing: 3,
          borderRadius: 4,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      ...options,
      cutout: '72%',
      plugins: {
        ...options.plugins,
        legend: { display: false },
        tooltip: {
          ...options.plugins.tooltip,
          callbacks: {
            label: (context) => {
              const parsed = context.parsed as number;
              const share = total > 0 ? Math.round((parsed / total) * 100) : 0;
              return ` ${context.label ?? ''}: ${formatValue(parsed, spec.valueKind)} (${share} %)`;
            },
          },
        },
      },
    },
    plugins: [centerTextPlugin(spec.centerValue, spec.centerLabel, theme)],
  };

  return {
    config,
    legend: spec.labels.map((label, index) => ({
      label,
      value: formatValue(spec.values[index] ?? 0, spec.valueKind),
      percent: total > 0 ? Math.round(((spec.values[index] ?? 0) / total) * 100) : 0,
    })),
  };
}
