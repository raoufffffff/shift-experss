import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { GenerateInvitationDialog } from '@/components/invitations/GenerateInvitationDialog';
import { ViewInvitationDialog } from '@/components/invitations/ViewInvitationDialog';
import { Plus, QrCode, Link2, Copy, Trash2, Users, Calendar, CheckCircle, Eye, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { RestrictedAccess } from '@/components/access/RestrictedAccess';
import { useTranslation } from 'react-i18next';

interface Invitation {
  id: string;
  token: string;
  establishment_id: string;
  description: string | null;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  establishment: {
    name: string;
    city: string;
  };
  creator: {
    first_name: string;
    last_name: string;
  };
}

export function InvitationsManagementPage() {
  const { t, i18n } = useTranslation();
  const { company, user } = useAuthStore();
  const { selectedEstablishmentId } = useEstablishmentStore();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<{
    token: string;
    establishmentName: string;
  } | null>(null);

  // Fetch current establishment details
  const { data: currentEstablishment } = useQuery({
    queryKey: ['establishment', selectedEstablishmentId],
    queryFn: async () => {
      if (!selectedEstablishmentId) return null;

      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('id', selectedEstablishmentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEstablishmentId,
  });

  // Fetch invitations for selected establishment (or all establishments if none selected)
  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations', selectedEstablishmentId, company?.id],
    queryFn: async () => {
      logger.log('📥 Fetching invitations for:', selectedEstablishmentId || 'all establishments');

      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // If no establishment selected, fetch all invitations for the company
      if (!selectedEstablishmentId) {
        if (!company?.id) return [];

        // Fetch all establishments first
        const { data: allEstablishments, error: estError } = await supabase
          .from('establishments')
          .select('id')
          .eq('company_id', company.id);

        if (estError) throw estError;
        if (!allEstablishments || allEstablishments.length === 0) return [];

        // Fetch invitations for all establishments
        const allInvitations: Invitation[] = [];
        for (const est of allEstablishments) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/api/invitations/establishment/${est.id}`,
              {
                credentials: 'include',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              const activeInvitations = (data.invitations as Invitation[]).filter(inv => inv.is_active);
              allInvitations.push(...activeInvitations);
            }
          } catch (err) {
            logger.error('Error fetching invitations for establishment:', est.id, err);
          }
        }

        return allInvitations;
      }

      // Single establishment selected
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/invitations/establishment/${selectedEstablishmentId}`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch invitations');
      }

      const data = await response.json();
      // Filter to show only active invitations
      const activeInvitations = (data.invitations as Invitation[]).filter(inv => inv.is_active);
      return activeInvitations;
    },
    enabled: !!company?.id,
  });

  // Delete invitation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/invitations/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success(t('invitations.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });


  const handleDelete = (id: string) => {
    if (confirm(t('invitations.confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  const copyInvitationLink = (token: string) => {
    const url = `${window.location.origin}/invite/general/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(t('invitations.linkCopied'));
  };

  const handleViewInvitation = (token: string, establishmentName: string) => {
    setSelectedInvitation({ token, establishmentName });
    setViewDialogOpen(true);
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return <Badge variant="secondary" className="gap-1"><Calendar className="w-3 h-3" /> {t('invitations.expired')}</Badge>;
    }
    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return <Badge variant="secondary" className="gap-1"><Users className="w-3 h-3" /> {t('invitations.limitReached')}</Badge>;
    }
    return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> {t('invitations.active')}</Badge>;
  };

  // Check if there's an active invitation for the establishment
  const hasActiveInvitation = selectedEstablishmentId
    ? invitations?.some(inv => inv.is_active && inv.establishment_id === selectedEstablishmentId)
    : false;
  const canCreateInvitation = !!selectedEstablishmentId && !hasActiveInvitation;

  // Check if user is admin
  if (user?.role !== 'admin') {
    return <RestrictedAccess />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('invitations.management')}</h1>
          <p className="text-muted-foreground">
            {t('invitations.subtitle')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={() => {
              if (!selectedEstablishmentId || !currentEstablishment) {
                toast.error(t('invitations.selectEstablishmentError'));
                return;
              }
              if (hasActiveInvitation) {
                toast.error(t('invitations.removeActiveFirst'));
                return;
              }
              setSelectedEstablishment({ id: currentEstablishment.id, name: currentEstablishment.name });
              setCreateDialogOpen(true);
            }}
            disabled={!canCreateInvitation}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('invitations.createInvitation')}
          </Button>
          {!selectedEstablishmentId ? (
            <p className="text-xs text-muted-foreground">
              {t('invitations.selectEstablishmentToCreate')}
            </p>
          ) : hasActiveInvitation ? (
            <p className="text-xs text-muted-foreground">
              {t('invitations.removeActiveBeforeCreate')}
            </p>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      {invitations && invitations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {invitations.length}
                  </div>
                  <p className="text-xs text-gray-600">{t('invitations.activeInvitations')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {invitations.reduce((sum, i) => sum + i.current_uses, 0)}
                  </div>
                  <p className="text-xs text-gray-600">{t('invitations.totalRegistrations')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{invitations.length}</div>
                  <p className="text-xs text-gray-600">{t('invitations.totalInvitations')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="w-4 h-4" />
            {t('invitations.generatedInvitations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : !invitations || invitations.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {t('invitations.noInvitations')}
              </p>
              <Button
                onClick={() => {
                  if (currentEstablishment) {
                    setSelectedEstablishment({ id: currentEstablishment.id, name: currentEstablishment.name });
                    setCreateDialogOpen(true);
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('invitations.createFirstInvitation')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!selectedEstablishmentId && (
                    <TableHead>{t('establishments.establishment')}</TableHead>
                  )}
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('invitations.usage')}</TableHead>
                  <TableHead>{t('invitations.expiration')}</TableHead>
                  <TableHead>{t('invitations.createdOn')}</TableHead>
                  <TableHead className="w-[150px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    {!selectedEstablishmentId && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {invitation.establishment.name}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(invitation)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {invitation.current_uses}
                          {invitation.max_uses && ` / ${invitation.max_uses}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invitation.expires_at
                        ? new Date(invitation.expires_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'it' ? 'it-IT' : i18n.language === 'zh' ? 'zh-CN' : 'fr-FR')
                        : t('invitations.never')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invitation.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'it' ? 'it-IT' : i18n.language === 'zh' ? 'zh-CN' : 'fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvitation(invitation.token, invitation.establishment.name)}
                          title={t('invitations.viewQR')}
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInvitationLink(invitation.token)}
                          title={t('invitations.copyLink')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invitation.id)}
                          disabled={deleteMutation.isPending}
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedEstablishment && (
        <GenerateInvitationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          establishmentId={selectedEstablishment.id}
          establishmentName={selectedEstablishment.name}
        />
      )}

      {selectedInvitation && (
        <ViewInvitationDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          token={selectedInvitation.token}
          establishmentName={selectedInvitation.establishmentName}
        />
      )}
    </div>
  );
}
