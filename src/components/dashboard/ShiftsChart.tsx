import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleSupabaseError } from '@/lib/error-handler'

interface ShiftsChartProps {
  days?: number;
}

export function ShiftsChart({ days = 30 }: ShiftsChartProps) {
  const { t } = useTranslation();
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['shifts-chart', days],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // Fetch shifts for the period
      const { data: shifts, error } = await supabase
        .from('shifts')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'ShiftsChart',


          operation: 'query'


        });


        throw new Error(message);


      }
      // Generate all days in the range
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });

      // Group shifts by day
      const dataByDay = allDays.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayShifts = shifts?.filter(
          (s) => s.created_at && format(new Date(s.created_at), 'yyyy-MM-dd') === dayStr
        ) || [];

        return {
          date: format(day, 'dd MMM', { locale: fr }),
          published: dayShifts.length,
          filled: dayShifts.filter((s) => s.status === 'filled').length,
        };
      });

      return dataByDay;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="date"
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
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Line
          type="monotone"
          dataKey="published"
          stroke="#3B82F6"
          strokeWidth={2}
          name={t('dashboard.published')}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="filled"
          stroke="#10B981"
          strokeWidth={2}
          name={t('dashboard.filled')}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
