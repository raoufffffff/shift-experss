import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, Download, FileText, RefreshCw } from 'lucide-react'
import { logger } from '@/utils/logger'

interface Invoice {
  id: string
  reference: string
  type: 'freelancer_to_company' | 'platform_commission'
  status: 'draft' | 'issued' | 'void'
  seller_name: string
  buyer_name: string
  description: string
  quantity: number
  unit_price: number
  amount_ht: number
  tva_rate: number
  tva_amount: number
  amount_ttc: number
  issued_at: string
  created_at: string
  shift_id: string
}

export function InvoicesPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      params.set('limit', '100')

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      logger.error('Failed to fetch invoices', { error })
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleDownload = async (invoiceId: string) => {
    try {
      setDownloading(invoiceId)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      logger.error('Failed to download invoice', { error })
    } finally {
      setDownloading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase()
    return (
      inv.reference.toLowerCase().includes(q) ||
      inv.seller_name.toLowerCase().includes(q) ||
      inv.buyer_name.toLowerCase().includes(q) ||
      inv.description.toLowerCase().includes(q)
    )
  })

  const getTypeBadge = (type: Invoice['type']) => {
    if (type === 'freelancer_to_company') {
      return <Badge variant="secondary">Prestation</Badge>
    }
    return <Badge variant="outline">Commission</Badge>
  }

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'issued':
        return <Badge variant="success">Émise</Badge>
      case 'void':
        return <Badge variant="destructive">Annulée</Badge>
      default:
        return <Badge variant="warning">Brouillon</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Factures</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoices.length} facture{invoices.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder="Rechercher par référence, nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="freelancer_to_company">Prestation freelance</option>
            <option value="platform_commission">Commission plateforme</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Aucune facture</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Référence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Émetteur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destinataire</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">HT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">TVA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">TTC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">PDF</th>
                </tr>
              </thead> 
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{invoice.reference}</td>
                    <td className="px-4 py-3">{getTypeBadge(invoice.type)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{invoice.seller_name}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{invoice.buyer_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{invoice.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{invoice.amount_ht.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">{invoice.tva_amount.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{invoice.amount_ttc.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(invoice.issued_at)}</td>
                    <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(invoice.id)}
                        disabled={downloading === invoice.id}
                      >
                        <Download className={`w-4 h-4 ${downloading === invoice.id ? 'animate-pulse' : ''}`} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
