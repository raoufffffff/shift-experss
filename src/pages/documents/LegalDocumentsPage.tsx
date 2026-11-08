import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/Table';
import {
    FileText,
    Search,
    Eye,
    PenTool,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/utils/logger';
import { ContractSignatureModal } from './components/ContractSignatureModal';

export interface Contract {
    id: string;
    type: string;
    status: string;
    created_at: string;
    signed_at: string | null;
    employer_signed_at: string | null;
    employer_signature_svg: string | null;
    freelancer_signature_svg: string | null;
    contract_url: string | null;
    freelancer_application: {
        id: string;
        freelancer: {
            id: string;
            first_name: string;
            last_name: string;
            city: string | null;
        } | null;
        shift: {
            id: string;
            position_name: string;
            start_time: string;
            end_time: string;
            freelance_hourly_rate: number | null;
            establishment: {
                name: string;
                address: string | null;
                city: string | null;
            } | null;
        } | null;
    } | null;
}

export function LegalDocumentsPage() {
    const { t, i18n } = useTranslation();
    const { company } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'signed'>('all');

    // Modal state
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const { data: contracts, isLoading } = useQuery({
        queryKey: ['contracts', company?.id, filterStatus],
        queryFn: async () => {
            if (!company?.id) return [];

            let query = supabase.from('contracts')
                .select(`
                    *,
                    freelancer_application:freelancer_application_id (
                        id,
                        freelancer:freelancer_id (
                            id,
                            first_name,
                            last_name,
                            city
                        ),
                        shift:shift_id (
                            id,
                            position_name,
                            start_time,
                            end_time,
                            freelance_hourly_rate,
                            establishment:establishment_id (name, address, city)
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            // Since we need to check nested company_id from shift,
            // the policy should already handle the filtering.
            // But we filter by status if needed.
            if (filterStatus === 'pending') {
                query = query.in('status', ['pending', 'signed_freelancer']);
            } else if (filterStatus === 'signed') {
                query = query.eq('status', 'signed');
            }

            const { data, error } = await query;
            if (error) {
                logger.error('Error fetching contracts:', error);
                return [];
            }
            return (data || []) as unknown as Contract[];
        },
        enabled: !!company?.id
    });

    const filteredContracts = contracts?.filter(contract => {
        const freelancer = contract.freelancer_application?.freelancer;
        const freelancerName = `${freelancer?.first_name || ''} ${freelancer?.last_name || ''}`.toLowerCase();
        const positionName = (contract.freelancer_application?.shift?.position_name || '').toLowerCase();
        return freelancerName.includes(searchTerm.toLowerCase()) || positionName.includes(searchTerm.toLowerCase());
    });

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'signed':
                return <Chip variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>{t('legalDocuments.status.signed')}</Chip>;
            case 'pending':
                return <Chip variant="warning" icon={<Clock className="w-3 h-3" />}>{t('legalDocuments.status.pending')}</Chip>;
            case 'signed_freelancer':
                return <Chip variant="warning" icon={<PenTool className="w-3 h-3" />}>{t('legalDocuments.status.signedFreelancer')}</Chip>;
            case 'signed_employer':
                return <Chip variant="warning" icon={<PenTool className="w-3 h-3" />}>{t('legalDocuments.status.signedEmployer')}</Chip>;
            default:
                return <Chip variant="default">{status}</Chip>;
        }
    };

    const handleOpenSignatureModal = (contract: Contract) => {
        setSelectedContract(contract);
        setIsSignatureModalOpen(true);
    };

    const handleViewContract = (contract: Contract) => {
        const app = contract.freelancer_application;
        const shift = app?.shift;
        const freelancer = app?.freelancer;

        if (!shift || !freelancer) return;

        const fullName = `${freelancer.first_name || ''} ${freelancer.last_name || ''}`.trim();
        const establishmentName = shift.establishment?.name || 'N/A';
        const establishmentAddress = [shift.establishment?.address, shift.establishment?.city].filter(Boolean).join(', ');
        const freelancerAddress = freelancer.city || 'Non renseigné';
        const positionName = shift.position_name || 'Prestataire';

        const missionDate = new Date(shift.start_time).toLocaleDateString('fr-FR');
        const startTime = new Date(shift.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(shift.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const hourlyRate = shift.freelance_hourly_rate || 0;
        const durationMs = new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const totalAmount = (hourlyRate * durationHours).toFixed(2);

        const freelancerSignedDate = contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('fr-FR') : '';
        const employerSignedDate = contract.employer_signed_at ? new Date(contract.employer_signed_at).toLocaleDateString('fr-FR') : '';

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Contrat ${contract.id.slice(0, 8).toUpperCase()}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #FF0058; }
    .logo { font-size: 28px; font-weight: 800; color: #FF0058; letter-spacing: -1px; margin-bottom: 8px; text-transform: uppercase; }
    .doc-title { font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 600; }
    .parties-container { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 40px; }
    .party-box { flex: 1; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .party-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 12px; letter-spacing: 1px; }
    .party-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-info { font-size: 13px; color: #475569; line-height: 1.5; }
    .section { margin-bottom: 30px; }
    .section-header { font-size: 13px; text-transform: uppercase; font-weight: 700; color: #FF0058; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
    .grid-row { display: flex; gap: 20px; margin-bottom: 15px; }
    .info-card { flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .financial-summary { background: #FF005808; border: 1px solid #FF005820; border-radius: 8px; padding: 20px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 14px; font-weight: 600; color: #FF0058; }
    .total-amount { font-size: 24px; font-weight: 800; color: #FF0058; }
    .legal-text { font-size: 12px; color: #475569; text-align: justify; line-height: 1.7; }
    .signatures-section { margin-top: 60px; page-break-inside: avoid; }
    .sign-row { display: flex; justify-content: space-between; gap: 40px; }
    .sign-box { flex: 1; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; min-height: 180px; display: flex; flex-direction: column; align-items: center; background: #fff; }
    .sign-role { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; margin-bottom: 8px; letter-spacing: 1px; }
    .sign-name { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 20px; text-align: center; }
    .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
</style></head><body>
    <div class="header">
        <div class="logo">SHIFT EXPRESS</div>
        <div class="doc-title">Contrat de Prestation de Services</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Réf: ${contract.id.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="parties-container">
        <div class="party-box">
            <div class="party-label">L'Entreprise (Client)</div>
            <div class="party-name">${establishmentName}</div>
            <div class="party-info">${establishmentAddress}</div>
        </div>
        <div class="party-box">
            <div class="party-label">Le Freelance (Prestataire)</div>
            <div class="party-name">${fullName}</div>
            <div class="party-info">${freelancerAddress}</div>
        </div>
    </div>
    <div class="section">
        <div class="section-header">1. Détails de la Mission</div>
        <div class="grid-row">
            <div class="info-card"><div class="info-label">Poste</div><div class="info-value">${positionName}</div></div>
            <div class="info-card"><div class="info-label">Date</div><div class="info-value">${missionDate}</div></div>
        </div>
        <div class="grid-row">
            <div class="info-card"><div class="info-label">Horaires</div><div class="info-value">${startTime} - ${endTime}</div></div>
            <div class="info-card"><div class="info-label">Lieu</div><div class="info-value">${establishmentAddress}</div></div>
        </div>
    </div>
    <div class="section">
        <div class="section-header">2. Conditions Financières</div>
        <div class="grid-row">
            <div class="info-card"><div class="info-label">Taux Horaire</div><div class="info-value">${hourlyRate}€ / heure</div></div>
            <div class="info-card"><div class="info-label">Durée Estimée</div><div class="info-value">${durationHours.toFixed(1)} heures</div></div>
        </div>
        <div class="financial-summary">
            <div class="total-label">Total Estimé</div>
            <div class="total-amount">${totalAmount} €</div>
        </div>
    </div>
    <div class="section">
        <div class="section-header">3. Clauses Légales</div>
        <div class="legal-text">
            <p style="margin-bottom: 10px;"><strong>Statut d'Indépendant :</strong> Le Freelance déclare exercer son activité en toute indépendance, sans lien de subordination avec l'Entreprise. Il est seul responsable de ses obligations sociales et fiscales.</p>
            <p><strong>Responsabilité :</strong> Le Freelance s'engage à réaliser la mission selon les règles de l'art et déclare disposer d'une assurance responsabilité civile professionnelle valide pour couvrir les éventuels dommages liés à son activité.</p>
        </div>
    </div>
    <div class="signatures-section">
        <div class="section-header">Signatures</div>
        <div class="sign-row">
            <div class="sign-box">
                <div class="sign-role">Pour l'Entreprise</div>
                <div class="sign-name">${establishmentName}</div>
                ${contract.employer_signature_svg && contract.employer_signature_svg !== 'auto_signed'
                    ? `<img src="${contract.employer_signature_svg}" width="180" height="90" />`
                    : contract.status === 'signed'
                        ? '<div style="color: #10b981; font-style: italic;">Signé électroniquement</div>'
                        : '<div style="color: #94a3b8; font-style: italic;">En attente de signature</div>'
                }
                ${employerSignedDate ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 10px;">Signé le ${employerSignedDate}</div>` : ''}
            </div>
            <div class="sign-box" ${contract.signed_at ? 'style="border-color: #10b981; background: #f0fdf4;"' : ''}>
                <div class="sign-role">Le Freelance</div>
                <div class="sign-name">${fullName}</div>
                ${contract.freelancer_signature_svg && contract.freelancer_signature_svg !== 'auto_signed'
                    ? '<div style="color: #10b981; font-style: italic;">Signé numériquement</div>'
                    : contract.status === 'signed'
                        ? '<div style="color: #10b981; font-style: italic;">Signé électroniquement</div>'
                        : '<div style="color: #94a3b8; font-style: italic;">En attente de signature</div>'
                }
                ${freelancerSignedDate ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 10px;">Signé le ${freelancerSignedDate}</div>` : ''}
            </div>
        </div>
    </div>
    <div class="footer">Généré automatiquement par Shift Express — La plateforme de gestion de shifts freelance.</div>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        {t('legalDocuments.pageTitle')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('legalDocuments.pageSubtitle')}
                    </p>
                </div>
            </div>

            <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="w-full md:w-96">
                            <Input
                                icon={<Search className="w-4 h-4" />}
                                placeholder={t('legalDocuments.searchPlaceholder')}
                                className="h-10 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={filterStatus === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterStatus('all')}
                                className="rounded-lg h-9"
                            >
                                {t('legalDocuments.filterAll')}
                            </Button>
                            <Button
                                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterStatus('pending')}
                                className="rounded-lg h-9 text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-50"
                            >
                                {t('legalDocuments.filterToSign')}
                            </Button>
                            <Button
                                variant={filterStatus === 'signed' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterStatus('signed')}
                                className="rounded-lg h-9 text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                            >
                                {t('legalDocuments.filterSigned')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow>
                                    <TableHead>{t('legalDocuments.table.contract')}</TableHead>
                                    <TableHead>{t('legalDocuments.table.freelancer')}</TableHead>
                                    <TableHead>{t('legalDocuments.table.mission')}</TableHead>
                                    <TableHead>{t('legalDocuments.table.status')}</TableHead>
                                    <TableHead>{t('legalDocuments.table.date')}</TableHead>
                                    <TableHead className="text-right">{t('legalDocuments.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            {t('legalDocuments.loading')}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredContracts?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <AlertCircle className="w-8 h-8 opacity-20" />
                                                <p>{t('legalDocuments.noDocumentsFound')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredContracts?.map((contract) => (
                                        <TableRow key={contract.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold">{t('legalDocuments.contractId', { id: contract.id?.slice(0, 8) })}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{contract.type}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {contract.freelancer_application?.freelancer?.first_name} {contract.freelancer_application?.freelancer?.last_name}
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm font-medium">{contract.freelancer_application?.shift?.position_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {contract.freelancer_application?.shift?.start_time && format(new Date(contract.freelancer_application.shift.start_time), 'PP', { locale: fr })}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusChip(contract.status)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(contract.created_at), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {contract.status === 'signed' ? (
                                                        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleViewContract(contract)}>
                                                            <Eye className="w-4 h-4 mr-1.5" />
                                                            {t('legalDocuments.view', { defaultValue: 'Voir' })}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-amber-600 hover:bg-amber-700 rounded-lg"
                                                            onClick={() => handleOpenSignatureModal(contract)}
                                                        >
                                                            <PenTool className="w-4 h-4 mr-1.5" />
                                                            {t('legalDocuments.sign')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ContractSignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                contract={selectedContract}
                onSigned={() => queryClient.invalidateQueries({ queryKey: ['contracts'] })}
            />
        </div>
    );
}
