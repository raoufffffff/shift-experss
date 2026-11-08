import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { NewMessageDialog } from '@/components/chat/NewMessageDialog'
import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ChatPage() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeId = searchParams.get('id') || undefined

    const { conversations, messages, activeConversation, sendMessage, createConversation, isLoading, isError } = useChat(activeId)
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)

    // Mobile responsive state
    const isMobile = window.innerWidth < 768
    const validActiveId = conversations?.find(c => c.id === activeId)?.id

    const handleSelectConversation = useCallback((id: string) => {
        if (!id) {
            setSearchParams({})
            return
        }
        setSearchParams({ id })
    }, [setSearchParams])

    const handleSelectContact = useCallback(async (userId: string, type: 'employee' | 'freelancer') => {
        try {
            const conv = await createConversation.mutateAsync({ participantId: userId, type })
            handleSelectConversation(conv.id)
        } catch (error) {
            console.error('Error creating conversation:', error)
        }
    }, [createConversation, handleSelectConversation])

    // Handle auto-starting conversation from URL params
    useEffect(() => {
        const userId = searchParams.get('userId')
        const type = searchParams.get('type') as 'employee' | 'freelancer'

        if (userId && type && conversations) {
            // Check if conversation already exists
            const existing = conversations.find(c =>
                c.type === type &&
                c.participants.some(p => p.user_id === userId)
            )

            if (existing) {
                handleSelectConversation(existing.id)
                // Clean up URL
                const next = new URLSearchParams(searchParams)
                next.delete('userId')
                next.delete('type')
                setSearchParams(next, { replace: true })
            } else if (!createConversation.isPending) {
                handleSelectContact(userId, type)

                // Keep URL params until the conversation is successfully created and selected
                // This ensures that if the first query fails or is empty, we retry on the next render
            }
        }
    }, [searchParams, conversations, createConversation.isPending, handleSelectContact, handleSelectConversation, setSearchParams])
  
    const handleSendMessage = async (content: string) => {
        if (activeId) { 
            await sendMessage.mutateAsync({ content, conversationId: activeId })
        }
    }

    if (isLoading && !conversations) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground">
                <p>{t('chat.loadingError')}</p>
                <p className="text-sm">{t('chat.retryLater')}</p>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-background border-y md:border border-border flex shadow-none md:shadow-sm md:rounded-3xl overflow-hidden transition-all duration-500">
            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-[350px] lg:w-[400px] shrink-0 h-full border-r border-border bg-background z-30 transition-all duration-300",
                activeId ? "hidden md:block" : "block"
            )}>
                <ConversationList
                    conversations={conversations || []}
                    activeId={activeId}
                    onSelect={handleSelectConversation}
                    onNewMessage={() => setIsNewMessageOpen(true)}
                />
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 h-full flex flex-col min-w-0 bg-background transition-all duration-300",
                !activeId ? "hidden md:flex" : "flex"
            )}>
                <ChatWindow
                    conversation={activeConversation || undefined}
                    messages={messages || []}
                    isLoading={isLoading}
                    onSendMessage={handleSendMessage}
                    onNewMessage={() => setIsNewMessageOpen(true)}
                    onBack={() => handleSelectConversation('')}
                />
            </div>

            <NewMessageDialog
                isOpen={isNewMessageOpen}
                onClose={() => setIsNewMessageOpen(false)}
                onSelect={handleSelectContact}
            />
        </div>
    )
}
