import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { MessageSquare, Clock } from 'lucide-react';
import { logger } from '@/utils/logger';

interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  companies: { name: string } | null;
}

interface SupportMetrics {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  avg_resolution_time_hours: number | null;
}

export function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    fetchTickets();
    fetchMetrics();
  }, [statusFilter, priorityFilter]);

  async function fetchTickets() {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/support/tickets?${params}`);
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      logger.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetrics() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/support/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch (error) {
      logger.error('Error fetching metrics:', error);
    }
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchTickets();
      fetchMetrics();
    } catch (error) {
      logger.error('Error updating ticket:', error);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-gray-600 mt-1">Manage customer support requests</p>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
            <p className="text-3xl font-bold">{metrics.total_tickets || 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">Open</p>
            <p className="text-3xl font-bold text-yellow-600">{metrics.open_tickets || 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">{metrics.in_progress_tickets || 0}</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold">{metrics.avg_resolution_time_hours?.toFixed(1) || 0}h</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <Select
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </div>
      </Card>

      {/* Tickets Table */}
      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-xs">{ticket.id.slice(0, 8)}</code>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium">{ticket.subject}</div>
                  <div className="text-sm text-gray-500">{ticket.description?.slice(0, 60)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{ticket.companies?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      ticket.priority === 'urgent' ? 'destructive' :
                      ticket.priority === 'high' ? 'warning' :
                      'secondary'
                    }
                  >
                    {ticket.priority}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      ticket.status === 'open' ? 'warning' :
                      ticket.status === 'in_progress' ? 'default' :
                      ticket.status === 'resolved' ? 'success' :
                      'secondary'
                    }
                  >
                    {ticket.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/crm/support/${ticket.id}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    {ticket.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                      >
                        Start
                      </Button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}