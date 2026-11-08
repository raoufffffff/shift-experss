import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Search, Download } from 'lucide-react';
import { logger } from '@/utils/logger';

interface CRMCompany {
  company_id: string;
  company_name: string;
  public_id: string | null;
  plan: string | null;
  subscription_status: string | null;
  total_shifts: number;
  employee_count: number;
  shifts_last_30d: number;
  fill_rate: number;
  health_score: number;
}

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CRMCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/crm-live/companies`);
      const response = await res.json();
      setCompanies(response.companies || []);
    } catch (error) {
      logger.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    window.open(`${import.meta.env.VITE_API_URL}/api/reports/export/companies`, '_blank');
  }

  const filteredCompanies = companies.filter(company =>
    (company.company_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-gray-600 mt-1">Manage all customer companies</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4 mb-6">
        <Input
          icon={<Search className="w-4 h-4" />}
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {/* Companies Table */}
      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Establishments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shifts (30d)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fill Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies.map((company) => (
              <tr key={company.company_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{company.company_name}</div>
                    {company.public_id && (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 uppercase tracking-tighter">
                        {company.public_id}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="secondary">{company.plan?.toUpperCase() || 'FREE'}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={company.subscription_status === 'active' ? 'success' : 'secondary'}>
                    {company.subscription_status || 'inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{company.total_shifts || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">{company.employee_count || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">{company.shifts_last_30d || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">{company.fill_rate || 0}%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${company.health_score > 70 ? 'bg-green-500' :
                            company.health_score > 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                          }`}
                        style={{ width: `${company.health_score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{company.health_score}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/crm/companies/${company.company_id}`}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}