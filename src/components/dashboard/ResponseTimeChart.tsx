import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function ResponseTimeChart() {
  const { t } = useTranslation();
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['response-time-chart'],
    queryFn: async () => {
      // Fetch response times
      const { data: responses, error } = await supabase
        .from('shift_applications')
        .select('response_time_seconds, status')
        .eq('status', 'accepted')
        .not('response_time_seconds', 'is', null)
        .order('response_time_seconds');

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'ResponseTimeChart',


          operation: 'query'


        });


        throw new Error(message);


      }
      // Group by time ranges
      const ranges = [
        { label: '< 1 min', max: 60, count: 0 },
        { label: '1-3 min', max: 180, count: 0 },
        { label: '3-5 min', max: 300, count: 0 },
        { label: '5-10 min', max: 600, count: 0 },
        { label: '> 10 min', max: Infinity, count: 0 },
      ];

      responses?.forEach((r) => {
        const seconds = r.response_time_seconds || 0;

        if (seconds < 60) ranges[0].count++;
        else if (seconds < 180) ranges[1].count++;
        else if (seconds < 300) ranges[2].count++;
        else if (seconds < 600) ranges[3].count++;
        else ranges[4].count++;
      });

      return ranges;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '12px',
          }}
          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
        />
        <Bar
          dataKey="count"
          fill="#3B82F6"
          radius={[8, 8, 0, 0]}
          name={t('dashboard.responses')}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
