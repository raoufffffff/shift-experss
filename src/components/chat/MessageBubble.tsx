import { useAuthStore } from '@/stores/authStore'
import { Message } from '@/types/chat'
import { cn } from '@/lib/cn'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MessageBubbleProps {
    message: Message
    isNextSameSender?: boolean
    isRead?: boolean
}

export function MessageBubble({ message, isNextSameSender, isRead }: MessageBubbleProps) {
    const { t } = useTranslation()
    const { user } = useAuthStore()
    const isMe = message.sender_id === user?.id
    const [isAnimated, setIsAnimated] = useState(false)

    useEffect(() => {
        // Trigger animation on mount
        const timer = setTimeout(() => setIsAnimated(true), 10)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className={cn(
            "flex w-full mb-1 transition-all duration-300 ease-out",
            isMe ? "justify-end" : "justify-start",
            // Animation states
            isAnimated
                ? "opacity-100 translate-x-0 scale-100"
                : isMe
                    ? "opacity-0 translate-x-8 scale-95"
                    : "opacity-0 -translate-x-8 scale-95"
        )}>
            <div className={cn(
                "max-w-[75%] px-4 py-3 text-sm relative group transition-all duration-300",
                isMe
                    ? "bg-primary text-primary-foreground rounded-[20px] rounded-br-[4px] border border-primary/20"
                    : "bg-muted/50 backdrop-blur-sm text-foreground/90 rounded-[20px] rounded-bl-[4px] border border-border",
                isNextSameSender && (isMe ? "rounded-br-[20px]" : "rounded-bl-[20px]"),
                // Hover effect
                "hover:shadow-lg hover:-translate-y-0.5"
            )}>
                <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">{message.content}</p>
                <div className={cn(
                    "flex items-center gap-2 mt-1.5 transition-all duration-300",
                    isMe ? "justify-end" : "justify-start"
                )}>
                    <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider",
                        isMe ? "text-primary-foreground/50" : "text-muted-foreground/60"
                    )}>
                        {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                    </span>
                    {isMe && (
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black uppercase tracking-tighter text-primary-foreground/40">
                                {isRead ? t('chat.read') : t('chat.sent')}
                            </span>
                            <div className={cn(
                                "w-3 h-3 transition-colors",
                                isRead ? "text-primary-foreground/80" : "text-primary-foreground/40"
                            )}>
                                <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
                                    {isRead ? (
                                        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM1 12l1.41 1.41L7.17 8 8.59 9.4 4.24 13.76 1 10.5 1.41 9.09z" />
                                    ) : (
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    )}
                                </svg>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
