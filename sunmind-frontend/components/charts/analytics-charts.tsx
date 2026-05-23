'use client';

export function AnalyticsCharts({ period }: { period: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
      <p>Аналитика ({period}) — загружается...</p>
    </div>
  );
}
