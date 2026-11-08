import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Search, Loader2, X, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/cn'

interface NewMessageDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (userId: string, type: 'employee' | 'freelancer') => void
}

interface Contact {
    user_id: string
    first_name: string
    last_name: string
    email: string
    type: 'employee' | 'freelancer'
    profile_photo_url?: string
}

export function NewMessageDialog({ isOpen, onClose, onSelect }: NewMessageDialogProps) {
    const { t } = useTranslation()
    const { user, company } = useAuthStore()
    const [search, setSearch] = useState('')
    const isEmployer = ['admin', 'manager'].includes(user?.role || '')
    const [activeTab, setActiveTab] = useState<'employees' | 'freelancers' | 'managers'>('employees')

    // Force default tab for non-employers
    if (!isEmployer && activeTab !== 'managers') {
        setActiveTab('managers')
    }

    const { data: contacts, isLoading } = useQuery({
        queryKey: ['chat-contacts-redesign', company?.id, user?.role],
        queryFn: async () => {
            if (!company?.id) return []

            // CASE 1: USER IS EMPLOYER (Admin/Manager)
            // Can see: Employees + Freelancers
            if (isEmployer) {
                // 1. Fetch Establishments for this company
                const { data: establishments } = await supabase
                    .from('establishments')
                    .select('id')
                    .eq('company_id', company.id)

                const establishmentIds = establishments?.map(e => e.id) || []

                // 2. Fetch Employees
                const { data: employees, error: empError } = await supabase
                    .from('employees')
                    .select(`
                        user_id,
                        user:users!user_id(id, first_name, last_name, email, avatar_url)
                    `)
                    .eq('company_id', company.id)
                    .not('user_id', 'is', null)

                if (empError) throw empError

                // 3. Fetch Freelancers linked to establishments of this company
                let freelancerContacts: Contact[] = []
                if (establishmentIds.length > 0) {
                    const { data: freelancers, error: freeError } = await supabase
                        .from('establishment_freelancers')
                        .select(`
                        freelancer:freelancers(
                            user_id,
                            first_name,
                            last_name,
                            email,
                            profile_photo_url
                        )
                    `)
                        .in('establishment_id', establishmentIds)

                    if (freeError) throw freeError

                    freelancerContacts = (freelancers || [])
                        .map((f) => ({
                            user_id: f.freelancer?.user_id || '',
                            first_name: f.freelancer?.first_name || '',
                            last_name: f.freelancer?.last_name || '',
                            email: f.freelancer?.email || '',
                            profile_photo_url: f.freelancer?.profile_photo_url || undefined,
                            type: 'freelancer' as const
                        }))
                        .filter((c) => c.user_id)
                }

                const employeeContacts: Contact[] = (employees || [])
                    .map((e) => {
                        const u = e.user as unknown as Record<string, string | null> | null
                        return {
                            user_id: e.user_id!,
                            first_name: u?.first_name || '',
                            last_name: u?.last_name || '',
                            email: u?.email || '',
                            profile_photo_url: u?.avatar_url || undefined,
                            type: 'employee' as const
                        }
                    })
                    .filter((c) => c.user_id)

                return [...employeeContacts, ...freelancerContacts]
            }

            // CASE 2: USER IS EMPLOYEE OR FREELANCER
            // Can see: ONLY Admin/Managers of the company
            else {
                // Fetch users with role admin/manager in this company
                const { data: managers, error: mgrError } = await supabase
                    .from('users')
                    .select('id, first_name, last_name, email, role')
                    .eq('company_id', company.id)
                    .in('role', ['admin', 'manager'])

                if (mgrError) throw mgrError

                return (managers || []).map((m) => ({
                    user_id: m.id,
                    first_name: m.first_name || '',
                    last_name: m.last_name || '',
                    email: m.email || '',
                    profile_photo_url: undefined,
                    type: 'employee' as const // Managers are technically internal employees for chat context
                }))
            }
        },
        enabled: isOpen && !!company?.id
    })

    const filtered = useMemo(() => {
        let list = contacts || []

        // Filter by tab only if Employer
        if (isEmployer) {
            list = list.filter(c => activeTab === 'employees' ? c.type === 'employee' : c.type === 'freelancer')
        }

        if (!search) return list
        return list.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase())
        )
    }, [contacts, activeTab, search, isEmployer])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[550px] h-[600px] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 h-16 border-b border-border sticky top-0 bg-transparent z-20">
                    <DialogTitle className="text-lg font-bold text-foreground">{t('chat.newMessage')}</DialogTitle>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-muted transition-all active:scale-95"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Sub-Header / Search Area */}
                <div className="p-6 space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={t('chat.searchContact')}
                            className="w-full pl-11 pr-4 py-2.5 bg-muted/50 border border-border focus:border-primary/50 rounded-xl text-sm placeholder:text-muted-foreground text-foreground outline-none transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Tabs (Only for Employer) */}
                    {isEmployer && (
                        <div className="flex p-1 bg-muted rounded-xl border border-border">
                            <button
                                onClick={() => setActiveTab('employees')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    activeTab === 'employees'
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t('chat.employees')}
                            </button>
                            <button
                                onClick={() => setActiveTab('freelancers')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                    activeTab === 'freelancers'
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t('chat.freelancersPlural')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 transition-transform">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-1">{t('chat.noResults')}</h3>
                            <p className="text-muted-foreground text-sm max-w-[240px]">
                                {t('chat.noContactsFound')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map(contact => (
                                <button
                                    key={contact.user_id}
                                    onClick={() => {
                                        onSelect(contact.user_id, contact.type)
                                        onClose()
                                    }}
                                    className="w-full text-left p-4 rounded-2xl flex items-center gap-4 hover:bg-muted active:bg-muted/80 transition-all group"
                                >
                                    <div className="relative shrink-0">
                                        {contact.profile_photo_url ? (
                                            <div className="w-12 h-12 rounded-2xl p-[1px] bg-muted group-hover:bg-primary transition-all duration-300">
                                                <img
                                                    src={contact.profile_photo_url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="w-full h-full rounded-[15px] object-cover bg-card border border-border"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm transition-transform duration-300">
                                                {contact.first_name?.[0]?.toUpperCase()}{contact.last_name?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base text-foreground group-hover:text-foreground transition-colors">
                                            {contact.first_name} {contact.last_name}
                                        </div>
                                        <div className="text-muted-foreground text-xs truncate font-medium">
                                            {contact.email}
                                        </div>
                                    </div>
                                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
