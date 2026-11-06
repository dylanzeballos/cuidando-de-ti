/**
 * Tipos, formateo y opciones compartidas por los gráficos del panel. Las
 * funciones son puras: reciben el tema resuelto en el navegador.
 */

export type ChartTheme = {
  ink: string;
  muted: string;
  line: string;
  surface: string;
  palette: string[];
};

export type ChartSpec =
  | {
      kind: 'line';
      labels: string[];
      series: { label: string; data: number[]; emphasis?: boolean }[];
      unit?: 'money' | 'number';
    }
  | {
      kind: 'bar';
      labels: string[];
      values: number[];
      details?: string[];
      datasetLabel?: string;
    }
  | {
      kind: 'doughnut';
      labels: string[];
      values: number[];
      centerValue: string;
      centerLabel: string;
      valueKind?: 'money' | 'number';
    };

export type ChartLegendItem = { label: string; value: string; percent: number };

export type ChartBuild = {
  config: import('chart.js').ChartConfiguration;
  legend: ChartLegendItem[] | null;
};

const numberFormat = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat('es-BO', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function moneyLabel(value: number): string {
  return `Bs ${numberFormat.format(Number.isFinite(value) ? value : 0)}`;
}

export function compactValue(value: number, unit: 'money' | 'number' = 'money'): string {
  const text = compactFormat.format(Number.isFinite(value) ? value : 0);
  return unit === 'money' ? `Bs ${text}` : text;
}

export function compactMoney(value: number): string {
  return compactValue(value, 'money');
}

export function formatValue(value: number, kind: 'money' | 'number' = 'money'): string {
  if (kind === 'number') return new Intl.NumberFormat('es-BO').format(value);
  return moneyLabel(value);
}

export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (!hex.startsWith('#')) return hex;
  const value = hex.slice(1);
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function truncate(label: string, max = 20): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function tooltipStyle(theme: ChartTheme, unit: 'money' | 'number' = 'money') {
  return {
    backgroundColor: theme.ink,
    titleColor: theme.surface,
    bodyColor: theme.surface,
    padding: 12,
    cornerRadius: 10,
    boxPadding: 6,
    usePointStyle: true,
    callbacks: {
      label: (context: { dataset: { label?: string }; parsed: { y?: number; x?: number } }) => {
        const value = context.parsed.y ?? context.parsed.x ?? 0;
        const prefix = context.dataset.label ? `${context.dataset.label}: ` : '';
        return ` ${prefix}${formatValue(value, unit)}`;
      },
    },
  };
}

export function baseOptions(
  theme: ChartTheme,
  reducedMotion: boolean,
  unit: 'money' | 'number' = 'money',
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 650, easing: 'easeOutQuart' as const },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: theme.muted,
          usePointStyle: true,
          pointStyle: 'line' as const,
          boxWidth: 24,
          boxHeight: 8,
          padding: 16,
          font: { size: 11, weight: 600 as const },
        },
      },
      tooltip: tooltipStyle(theme, unit),
    },
  };
}
