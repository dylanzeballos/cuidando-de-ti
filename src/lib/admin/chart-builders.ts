import type { ChartConfiguration, ScriptableContext } from 'chart.js';
import {
  baseOptions,
  compactMoney,
  compactValue,
  moneyLabel,
  truncate,
  withAlpha,
  type ChartSpec,
  type ChartTheme,
} from '@/lib/admin/chart-theme';

export function lineConfig(
  spec: Extract<ChartSpec, { kind: 'line' }>,
  theme: ChartTheme,
  reducedMotion: boolean,
): ChartConfiguration {
  const options = baseOptions(theme, reducedMotion, spec.unit);
  return {
    type: 'line',
    data: {
      labels: spec.labels,
      datasets: spec.series.map((series, index) => {
        const emphasized = series.emphasis ?? index === 0;
        const color = emphasized ? theme.palette[0] : theme.muted;
        return {
          label: series.label,
          data: series.data,
          borderColor: color,
          backgroundColor: emphasized
            ? (context: ScriptableContext<'line'>) => {
                const { ctx, chartArea } = context.chart;
                if (!chartArea) return 'transparent';
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, withAlpha(theme.palette[0], 0.28));
                gradient.addColorStop(1, withAlpha(theme.palette[0], 0));
                return gradient;
              }
            : 'transparent',
          fill: emphasized,
          tension: 0.36,
          borderWidth: emphasized ? 2.4 : 1.6,
          borderDash: emphasized ? [] : [5, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: theme.surface,
          pointHoverBorderColor: color,
        };
      }),
    },
    options: {
      ...options,
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: theme.muted, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.line, drawTicks: false },
          border: { display: false },
          ticks: {
            color: theme.muted,
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: (value) => compactValue(Number(value), spec.unit),
          },
        },
      },
    },
  };
}

export function barConfig(
  spec: Extract<ChartSpec, { kind: 'bar' }>,
  theme: ChartTheme,
  reducedMotion: boolean,
): ChartConfiguration {
  const options = baseOptions(theme, reducedMotion);
  return {
    type: 'bar',
    data: {
      labels: spec.labels,
      datasets: [
        {
          label: spec.datasetLabel ?? 'Ingresos',
          data: spec.values,
          backgroundColor: (context: ScriptableContext<'bar'>) => {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return theme.palette[1];
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, withAlpha(theme.palette[1], 0.55));
            gradient.addColorStop(1, theme.palette[0]);
            return gradient;
          },
          borderRadius: 7,
          borderSkipped: false,
          barThickness: 16,
        },
      ],
    },
    options: {
      ...options,
      indexAxis: 'y',
      interaction: { mode: 'nearest', axis: 'y', intersect: false },
      plugins: {
        ...options.plugins,
        legend: { display: false },
        tooltip: {
          ...options.plugins.tooltip,
          callbacks: {
            label: (context) => ` ${moneyLabel(context.parsed.x ?? 0)}`,
            afterLabel: (context) => spec.details?.[context.dataIndex] ?? '',
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: theme.line, drawTicks: false },
          border: { display: false },
          ticks: {
            color: theme.muted,
            font: { size: 11 },
            maxTicksLimit: 4,
            callback: (value) => compactMoney(Number(value)),
          },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: theme.ink,
            font: { size: 11, weight: 600 },
            callback: (value, index) => truncate(spec.labels[index] ?? String(value)),
          },
        },
      },
    },
  };
}
