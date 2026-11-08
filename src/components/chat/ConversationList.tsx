import { Conversation } from '@/types/chat'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/cn'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Search, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NewMessageDialog } from './NewMessageDialog'
import { Button } from '@/components/ui/Button'
import { useChat } from '@/hooks/useChat'
import { useTranslation } from 'react-i18next'

interface ConversationListProps {
    conversations: Conversation[]
    activeId?: string
    onSelect: (id: string) => void
    onNewMessage: () => void
}

export function ConversationList({ conversations, activeId, onSelect, onNewMessage }: ConversationListProps) {
    const { t } = useTranslation()
    const { user, company } = useAuthStore()
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'employees' | 'freelancers'>('employees')

    // Auto-switch tab based on active conversation type
    useEffect(() => {
        if (activeId && conversations.length > 0) {
            const activeConv = conversations.find(c => c.id === activeId)
            if (activeConv) {
                const targetTab = activeConv.type === 'employee' ? 'employees' : 'freelancers'
                if (activeTab !== targetTab) {
                    setActiveTab(targetTab)
                }
            }
        }
    }, [activeId, conversations])

    const getOtherParticipant = (conv: Conversation) => {
        return conv.participants.find(p => p.user_id !== user?.id)?.user
    }

    const filteredConversations = conversations.filter(conv => {
        const other = getOtherParticipant(conv)
        if (!other) return false

        // Filter by conversation type facet
        const facet = activeTab === 'employees' ? 'employee' : 'freelancer'
        if (conv.type !== facet) return false

        // Filter by search
        const name = `${other.first_name} ${other.last_name}`.toLowerCase()
        return name.includes(search.toLowerCase())
    })

    return (
        <div className="flex flex-col h-full bg-background text-foreground w-full">
            {/* Header Area */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('chat.title')}</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onNewMessage}
                            className="p-2.5 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all group active:scale-95"
                            title={t('chat.newConversation')}
                        >
                            <Plus className="w-5 h-5 text-primary group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={t('chat.searchConversation')}
                        className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-transparent focus:bg-background focus:border-primary/20 rounded-2xl text-sm placeholder:text-muted-foreground/60 text-foreground outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-muted rounded-xl border border-border">
                    <button
                        onClick={() => {
                            setActiveTab('employees')
                            onSelect('') // Clear selection on switch
                        }}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                            activeTab === 'employees'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('chat.employees')}
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('freelancers')
                            onSelect('') // Clear selection on switch
                        }}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                            activeTab === 'freelancers'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('chat.freelancers')}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center mt-12">
                        <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center border border-border">
                            <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold">{t('chat.noMessages')}</h3>
                            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                                {activeTab === 'employees'
                                    ? t('chat.startChatEmployees')
                                    : t('chat.startChatFreelancers')}
                            </p>
                        </div>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold px-6 py-5 text-sm transition-all active:scale-95"
                            onClick={onNewMessage}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('chat.newConversation')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredConversations.map((conv) => {
                            const otherParticipant = conv.participants.find(p => p.user_id !== user?.id)
                            const otherUser = otherParticipant?.user

                            const displayName = (() => {
                                if (!otherUser) return ''
                                if (conv.type === 'employee') {
                                    return `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.email || ''
                                }
                                if (conv.type === 'freelancer' && otherUser.role_freelancer?.[0]) {
                                    const free = otherUser.role_freelancer[0]
                                    return free.full_name || `${free.first_name || ''} ${free.last_name || ''}`
                                }
                                return `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || otherUser.email || ''
                            })()

                            const initials = displayName
                                .split(' ')
                                .filter(Boolean)
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)

                            if (!otherUser) return null
                            const isActive = activeId === conv.id

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelect(conv.id)}
                                    className={cn(
                                        "w-full text-left p-4 md:px-6 md:py-4 flex items-center gap-4 transition-all relative group",
                                        isActive
                                            ? "bg-primary/[0.03] md:bg-primary/[0.03]"
                                            : "hover:bg-muted/50"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
                                    )}

                                    <div className="relative">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-105",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "bg-primary/10 text-primary"
                                        )}>
                                            {otherUser?.avatar_url || otherUser?.profile_photo_url ? (
                                                <img
                                                    src={otherUser.avatar_url || otherUser.profile_photo_url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="w-full h-full rounded-2xl object-cover"
                                                />
                                            ) : (
                                                <span>{initials}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={cn(
                                                "font-bold text-sm truncate tracking-tight transition-colors",
                                                isActive ? "text-foreground" : "text-foreground/90 group-hover:text-primary"
                                            )}>
                                                {displayName}
                                            </h3>
                                            {conv.last_message && (
                                                <span className={cn(
                                                    "text-[10px] font-medium whitespace-nowrap ml-2",
                                                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                                                )}>
                                                    {format(new Date(conv.last_message.created_at), 'HH:mm')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "text-xs truncate transition-colors flex-1",
                                                isActive ? "text-foreground/80 font-medium" : "text-muted-foreground group-hover:text-foreground/70",
                                                conv.unread_count && conv.unread_count > 0 && !isActive && "font-bold text-foreground"
                                            )}>
                                                {conv.last_message?.sender_id === user?.id && <span className="mr-1 opacity-70">{t('chat.you')}</span>}
                                                {conv.last_message?.content || t('chat.noMessageYet')}
                                            </p>
                                            {conv.unread_count !== undefined && conv.unread_count > 0 && (
                                                <div className="shrink-0 w-4 h-4 bg-primary rounded-lg flex items-center justify-center text-[9px] font-black text-primary-foreground shadow-sm">
                                                    {conv.unread_count}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
