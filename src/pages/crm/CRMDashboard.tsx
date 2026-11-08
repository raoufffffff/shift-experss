import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Calendar,
  Target,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}

interface FinancialMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  active_customers: number;
}

interface ProductMetrics {
  total_shifts: number;
  fill_rate: number;
  avg_fill_time_hours: number;
  total_revenue_saved: number;
}

interface PlanMixItem {
  plan: string;
  customer_count: number;
  plan_mrr: number;
}

interface SupportMetrics {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  avg_resolution_time_hours: number;
}

interface AtRiskCompany {
  company_id: string;
  company_name: string;
  plan: string;
  health_score: number;
  days_since_last_shift: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface DashboardKPIs {
  financial: FinancialMetrics;
  product: ProductMetrics;
  planMix: PlanMixItem[];
  support: SupportMetrics;
  atRisk: AtRiskCompany[];
}

interface MRRTimelineData {
  period_month: string;
  mrr: number;
  customer_count: number;
}

interface PlanMixChartData {
  name: string;
  value: number;
  mrr: number;
}

function KPICard({ title, value, change, icon, trend }: KPICardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function CRMDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [mrrTimeline, setMrrTimeline] = useState<MRRTimelineData[]>([]);
  const [atRiskCompanies, setAtRiskCompanies] = useState<AtRiskCompany[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch KPIs
      const kpisRes = await fetch(`${import.meta.env.VITE_API_URL}/api/crm/dashboard/kpis`);
      const kpisData = await kpisRes.json();
      setKpis(kpisData);

      // Fetch MRR timeline
      const mrrRes = await fetch(`${import.meta.env.VITE_API_URL}/api/crm/dashboard/mrr-timeline`);
      const mrrData = await mrrRes.json();
      setMrrTimeline(mrrData);

      setAtRiskCompanies(kpisData.atRisk || []);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return <div>Error loading dashboard</div>;
  }

  const { financial, product, planMix, support } = kpis;

  // Prepare plan mix data for pie chart
  const planMixData: PlanMixChartData[] = planMix?.map((item) => ({
    name: item.plan.toUpperCase(),
    value: item.customer_count,
    mrr: item.plan_mrr,
  })) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('crm.title')}</h1>
        <p className="text-gray-600 mt-1">{t('crm.subtitle')}</p>
      </div>

      {/* Financial KPIs */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          Financial Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="MRR"
            value={`$${financial?.mrr?.toFixed(0) || 0}`}
            icon={<DollarSign className="w-6 h-6 text-blue-600" />}
          />
          <KPICard
            title="ARR"
            value={`$${financial?.arr?.toFixed(0) || 0}`}
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          />
          <KPICard
            title="ARPU"
            value={`$${financial?.arpu?.toFixed(0) || 0}`}
            icon={<Users className="w-6 h-6 text-purple-600" />}
          />
          <KPICard
            title="Active Customers"
            value={financial?.active_customers || 0}
            icon={<Users className="w-6 h-6 text-blue-600" />}
          />
        </div>
      </div>

      {/* Product KPIs */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Product Metrics (Last 30 days)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Shifts"
            value={product?.total_shifts || 0}
            icon={<Calendar className="w-6 h-6 text-blue-600" />}
          />
          <KPICard
            title="Fill Rate"
            value={`${product?.fill_rate || 0}%`}
            icon={<Target className="w-6 h-6 text-green-600" />}
          />
          <KPICard
            title="Avg Fill Time"
            value={`${product?.avg_fill_time_hours?.toFixed(1) || 0}h`}
            icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          />
          <KPICard
            title="Revenue Saved"
            value={`$${product?.total_revenue_saved?.toFixed(0) || 0}`}
            icon={<DollarSign className="w-6 h-6 text-green-600" />}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">MRR Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mrrTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period_month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mrr" stroke="#0088FE" strokeWidth={2} name="MRR ($)" />
              <Line type="monotone" dataKey="customer_count" stroke="#00C49F" strokeWidth={2} name="Customers" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Plan Mix */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planMixData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name} (${entry.value})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {planMixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Support Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Support Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Tickets</p>
            <p className="text-2xl font-bold">{support?.total_tickets || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Open</p>
            <p className="text-2xl font-bold text-yellow-600">{support?.open_tickets || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{support?.in_progress_tickets || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Resolution Time</p>
            <p className="text-2xl font-bold">{support?.avg_resolution_time_hours?.toFixed(1) || 0}h</p>
          </div>
        </div>
      </Card>

      {/* At-Risk Companies */}
      {atRiskCompanies.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            At-Risk Companies
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Inactive</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {atRiskCompanies.map((company) => (
                  <tr key={company.company_id}>
                    <td className="px-4 py-3 whitespace-nowrap">{company.company_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="secondary">{company.plan.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              company.health_score > 70 ? 'bg-green-500' :
                              company.health_score > 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${company.health_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{company.health_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{Math.round(company.days_since_last_shift)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant={
                          company.risk_level === 'critical' ? 'destructive' :
                          company.risk_level === 'high' ? 'warning' :
                          'secondary'
                        }
                      >
                        {company.risk_level.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}