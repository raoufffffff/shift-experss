import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit, Trash } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Reward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  reward_type: string;
  reward_value: number;
  stock_available: number;
  unlimited_stock: boolean;
  active: boolean;
}

interface RewardStat {
  reward_id: string;
  times_redeemed: number;
  total_points_spent: number;
}

interface RewardFormData {
  name: string;
  description: string;
  points_cost: number;
  reward_type: string;
  reward_value: number;
  stock_available: number;
  unlimited_stock: boolean;
  active: boolean;
}

interface RewardDialogProps {
  reward: Reward | null;
  onClose: () => void;
  onSave: (formData: RewardFormData) => void;
}

export function RewardsManagement() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stats, setStats] = useState<RewardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  useEffect(() => {
    fetchRewards();
    fetchStats();
  }, []);

  async function fetchRewards() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards`);
      const data = await res.json();
      setRewards(data);
    } catch (error) {
      logger.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      logger.error('Error fetching stats:', error);
    }
  }

  async function handleSave(formData: RewardFormData) {
    try {
      const url = editingReward
        ? `${import.meta.env.VITE_API_URL}/api/rewards/${editingReward.id}`
        : `${import.meta.env.VITE_API_URL}/api/rewards`;

      const method = editingReward ? 'PATCH' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setShowDialog(false);
      setEditingReward(null);
      fetchRewards();
      fetchStats();
    } catch (error) {
      logger.error('Error saving reward:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/${id}`, {
        method: 'DELETE',
      });
      fetchRewards();
      fetchStats();
    } catch (error) {
      logger.error('Error deleting reward:', error);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Rewards Catalog</h1>
          <p className="text-gray-600 mt-1">Manage rewards for employees</p>
        </div>
        <Button onClick={() => { setEditingReward(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reward
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Rewards</p>
          <p className="text-3xl font-bold">{rewards.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Redemptions</p>
          <p className="text-3xl font-bold">{stats.reduce((sum, s) => sum + (s.times_redeemed || 0), 0)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Points Spent</p>
          <p className="text-3xl font-bold">{stats.reduce((sum, s) => sum + (s.total_points_spent || 0), 0)}</p>
        </Card>
      </div>

      {/* Rewards List */}
      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Redeemed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rewards.map((reward) => {
              const stat = stats.find(s => s.reward_id === reward.id);
              return (
                <tr key={reward.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{reward.name}</div>
                    <div className="text-sm text-gray-500">{reward.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{reward.points_cost}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary">{reward.reward_type || 'N/A'}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reward.unlimited_stock ? 'Unlimited' : reward.stock_available || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{stat?.times_redeemed || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={reward.active ? 'success' : 'secondary'}>
                      {reward.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingReward(reward); setShowDialog(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(reward.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Dialog */}
      {showDialog && (
        <RewardDialog
          reward={editingReward}
          onClose={() => { setShowDialog(false); setEditingReward(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function RewardDialog({ reward, onClose, onSave }: RewardDialogProps) {
  const [formData, setFormData] = useState<RewardFormData>({
    name: reward?.name || '',
    description: reward?.description || '',
    points_cost: reward?.points_cost || 0,
    reward_type: reward?.reward_type || 'voucher',
    reward_value: reward?.reward_value || 0,
    stock_available: reward?.stock_available || 0,
    unlimited_stock: reward?.unlimited_stock || false,
    active: reward?.active !== undefined ? reward.active : true,
  });

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">{reward ? 'Edit Reward' : 'Create Reward'}</h2>
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Input
            label="Points Cost"
            type="number"
            value={formData.points_cost}
            onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) })}
          />
          <Input
            label="Type"
            value={formData.reward_type}
            onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
          />
          <Input
            label="Value ($)"
            type="number"
            value={formData.reward_value}
            onChange={(e) => setFormData({ ...formData, reward_value: parseFloat(e.target.value) })}
          />
          <Input
            label="Stock Available"
            type="number"
            value={formData.stock_available}
            onChange={(e) => setFormData({ ...formData, stock_available: parseInt(e.target.value) })}
            disabled={formData.unlimited_stock}
          />
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.unlimited_stock}
              onChange={(e) => setFormData({ ...formData, unlimited_stock: e.target.checked })}
              className="mr-2"
            />
            Unlimited Stock
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            Active
          </label>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>Save</Button>
        </div>
      </div>
    </Dialog>
  );
}