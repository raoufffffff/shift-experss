import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Conversation, Message } from '@/types/chat'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, MessageSquare, Plus, Trash2, Info, ArrowLeft, Ban } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useChat } from '@/hooks/useChat'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ChatWindowProps {
    conversation?: Conversation
    messages: Message[]
    isLoading: boolean
    onSendMessage: (content: string) => void
    onNewMessage: () => void
    onBack?: () => void
}

export function ChatWindow({ conversation, messages, isLoading, onSendMessage, onNewMessage, onBack }: ChatWindowProps) {
    const { t } = useTranslation()
    const scrollRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const params = useParams<{ locale: string }>()

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
    const { deleteConversation, blockUser, canMessage } = useChat(conversation?.id)

    const handleDelete = async () => {
        if (!conversation) return
        try {
            await deleteConversation.mutateAsync(conversation.id)
            setIsDeleteDialogOpen(false)
            if (onBack) onBack() // Go back on delete
            navigate(`/${params.locale || 'fr'}/messages`)
            toast.success(t('chat.conversationDeleted'))
        } catch (error) {
            console.error('Error deleting conversation:', error)
            toast.error(t('chat.deleteError'))
        }
    }

    const handleBlock = async () => {
        const otherUserId = conversation?.participants.find(p => p.user_id !== user?.id)?.user_id
        if (!otherUserId || !conversation) return
        try {
            await blockUser.mutateAsync(otherUserId)
            await deleteConversation.mutateAsync(conversation.id)
            setIsBlockDialogOpen(false)
            if (onBack) onBack()
            navigate(`/${params.locale || 'fr'}/messages`)
            toast.success(t('chat.userBlocked'))
        } catch (error) {
            console.error('Error blocking user:', error)
            toast.error(t('chat.blockError'))
        }
    }

    const otherParticipant = conversation?.participants.find(p => p.user_id !== user?.id)?.user

    // Resolve display name based on facet
    const displayName = (() => {
        if (!otherParticipant) return ''
        if (conversation?.type === 'employee') {
            return `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.email || ''
        }
        if (conversation?.type === 'freelancer' && otherParticipant.role_freelancer?.[0]) {
            const free = otherParticipant.role_freelancer[0]
            return free.full_name || `${free.first_name || ''} ${free.last_name || ''}`
        }
        return `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.email || ''
    })()

    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
        }
    }, [messages, conversation?.id])

    // Also scroll once everything is loaded
    useEffect(() => {
        const timer = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
        }, 100)
        return () => clearTimeout(timer)
    }, [conversation?.id])

    if (isLoading && !conversation) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/5">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
            </div>
        )
    }

    if (!conversation) {
        return (
            <div className="h-full flex items-center justify-center bg-muted/10 text-muted-foreground p-6">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center border border-border mx-auto mb-6">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{t('chat.yourMessages')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                        {t('chat.selectConversation')}
                    </p>
                    <div className="pt-4">
                        <Button
                            onClick={onNewMessage}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold px-8 py-6 text-sm transition-all active:scale-95 shadow-lg shadow-primary/10"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('chat.newConversation')}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-3xl relative text-foreground border-l border-border overflow-hidden">
            {/* Header */}
            <div className="px-6 h-16 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-xl sticky top-0 z-20">
                <button
                    onClick={() => {
                        if (otherParticipant && conversation) {
                            let profileId = otherParticipant.id
                            if (conversation.type === 'employee' && otherParticipant.role_employee?.[0]?.id) {
                                profileId = otherParticipant.role_employee[0].id
                            } else if (conversation.type === 'freelancer' && otherParticipant.role_freelancer?.[0]?.id) {
                                profileId = otherParticipant.role_freelancer[0].id
                            }
                            navigate(`/${params.locale || 'fr'}/${conversation.type === 'employee' ? 'employees' : 'freelancers'}/${profileId}`)
                        }
                    }}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left group"
                >
                    <div className="md:hidden p-2 -ml-2 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onBack?.(); }}>
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <div className="relative">
                        {otherParticipant?.avatar_url || otherParticipant?.profile_photo_url ? (
                            <img
                                src={otherParticipant.avatar_url || otherParticipant.profile_photo_url}
                                alt=""
                                loading="lazy"
                                width={36}
                                height={36}
                                className="w-9 h-9 rounded-xl object-cover border border-border group-hover:border-primary/50 transition-colors"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                                {initials}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
                            {displayName}
                        </h3>
                    </div>
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsBlockDialogOpen(true)}
                        title={t('chat.blockUser')}
                        className="p-2.5 rounded-xl hover:bg-amber-50 transition-all text-muted-foreground hover:text-amber-500 group"
                    >
                        <Ban className="w-5 h-5 group-hover:scale-110 mb-0 transition-transform" />
                    </button>
                    <button
                        onClick={() => setIsDeleteDialogOpen(true)}
                        title={t('chat.deleteForMe')}
                        className="p-2.5 rounded-xl hover:bg-red-50 transition-all text-muted-foreground hover:text-red-500 group"
                    >
                        <Trash2 className="w-5 h-5 group-hover:scale-110 mb-0 transition-transform" />
                    </button>
                </div>
            </div>

           {/* Messages Area */}
<div
    ref={scrollRef}
    className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
>
    {isLoading ? (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
        </div>
    ) : (
        <>
            {/* Profile Section */}
            <div className="py-16 flex flex-col items-center text-center">
                {/* ... avatar, name, viewProfile ... */}
                {canMessage && <div className="w-full h-px bg-border mt-12 mb-4" />}
            </div>

            {canMessage ? (
                <>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                                <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground/30 fill-current">
                                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                                </svg>
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">{t('chat.sendFirstMessage')}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {messages.map((msg, i) => {
                                const isMe = msg.sender_id === user?.id
                                const otherParticipantPart = conversation.participants.find(p => p.user_id !== user?.id)
                                const isRead = isMe && otherParticipantPart?.last_read_at
                                    ? new Date(msg.created_at) <= new Date(otherParticipantPart.last_read_at)
                                    : false
                                return (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isNextSameSender={messages[i + 1]?.sender_id === msg.sender_id}
                                        isRead={isRead}
                                    />
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </>
            ) : (
                 <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="w-20 h-20 rounded-3xl bg-muted/40 border border-border/60 flex items-center justify-center mb-5 shadow-sm">
                        <Ban className="w-9 h-9 text-muted-foreground/40" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground/70 mb-2">
                        {t('chat.blockedTitle', { defaultValue: 'Conversation indisponible' })}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                        {t('chat.blockedHint', { defaultValue: 'Vous ne pouvez plus échanger de messages avec cette personne.' })}
                    </p>
                </div>
            )}
        </>
    )}
</div>

            {canMessage ? (
                <MessageInput onSend={onSendMessage} />
            ) : (
                <div className="p-4 bg-card/80 backdrop-blur-md border-t border-border sticky bottom-0 z-20">
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted/50 text-muted-foreground border border-border/50">
                        <Info className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium text-center">
                            {t('chat.unavailable')} <br className="hidden sm:block" />
                            {t('chat.unavailableReason')}
                        </p>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title={t('chat.deleteTitle')}
                description={t('chat.deleteDescription')}
                confirmLabel={t('chat.delete')}
                cancelLabel={t('chat.cancel')}
                variant="danger"
                isLoading={deleteConversation.isPending}
            />

            <ConfirmDialog
                isOpen={isBlockDialogOpen}
                onClose={() => setIsBlockDialogOpen(false)}
                onConfirm={handleBlock}
                title={t('chat.blockTitle')}
                description={t('chat.blockDescription', { name: displayName })}
                confirmLabel={t('chat.block')}
                cancelLabel={t('chat.cancel')}
                variant="danger"
                isLoading={blockUser.isPending}
            />
        </div>
    )
}
