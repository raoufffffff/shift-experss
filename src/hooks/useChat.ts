import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Conversation, Message, Participant } from '@/types/chat'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'
import { toast } from 'sonner'
import i18n from '@/i18n/config'

export function useChat(activeConversationId?: string, conversationType?: 'employee' | 'freelancer') {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const [isTyping, setIsTyping] = useState(false)

    // Fetch all conversations for the list
    const { data: conversations, isLoading: isConversationsLoading, isError: isConversationsError } = useQuery({
        queryKey: ['conversations', user?.id, conversationType],
        queryFn: async () => {
            if (!user?.id) return []

            let query = supabase
                .from('conversations')
                .select(`
          *,
            participants:conversation_participants(
            user_id,
            last_read_at,
            hidden_at,
            user:users(id, first_name, last_name, role, company_id, email, created_at)
          ),
          messages(id, conversation_id, content, created_at, sender_id)
        `)
                .order('updated_at', { ascending: false })
                .order('created_at', { foreignTable: 'messages', ascending: false })
                .limit(50)

            if (conversationType) {
                query = query.eq('type', conversationType)
            }

            const { data, error } = await query

            if (error) {
                logger.error('Error fetching conversations:', error)
                throw error
            }

            const rawConversations = data || []

            const userIds = Array.from(new Set(
                rawConversations.flatMap(c => c.participants.map(p => p.user_id))
            )).filter(Boolean)

            if (userIds.length === 0) return rawConversations.map(conv => ({
                ...conv,
                last_message: conv.messages?.[0] || undefined,
                unread_count: 0,
                participants: conv.participants.map(p => ({
                    ...p,
                    user: { ...p.user, role_employee: [] as Participant['user']['role_employee'], role_freelancer: [] as Participant['user']['role_freelancer'] }
                }))
            })) as Conversation[]

            const [employeesRes, freelancersRes] = await Promise.all([
                supabase.from('employees').select('id, user_id').in('user_id', userIds),
                supabase.from('freelancers').select('id, user_id, first_name, last_name, full_name, profile_photo_url').in('user_id', userIds)
            ])

            const employeeMap = new Map(employeesRes.data?.map(e => [e.user_id, e]))
            const freelancerMap = new Map(freelancersRes.data?.map(f => [f.user_id, f]))

            return rawConversations
                .map((conv) => {
                    const lastMessageDate = conv.messages?.[0]?.created_at || conv.created_at || ''
                    const myParticipant = conv.participants.find((p) => p.user_id === user?.id)
                    const isHidden = myParticipant?.hidden_at && lastMessageDate && new Date(myParticipant.hidden_at) > new Date(lastMessageDate)

                    if (isHidden) return null

                    const unreadCount = conv.messages?.filter((m) =>
                        m.sender_id !== user?.id &&
                        (!myParticipant?.last_read_at || (m.created_at && new Date(m.created_at) > new Date(myParticipant.last_read_at)))
                    ).length || 0

                    return {
                        ...conv,
                        last_message: conv.messages?.[0] || null,
                        unread_count: unreadCount,
                        participants: conv.participants.map((p) => {
                            const role_employee = employeeMap.get(p.user_id)
                            const role_freelancer = freelancerMap.get(p.user_id)

                            let profilePhoto: string | undefined
                            if (conv.type === 'freelancer' && role_freelancer?.profile_photo_url) {
                                profilePhoto = role_freelancer.profile_photo_url
                            }

                            return {
                                ...p,
                                user: {
                                    ...p.user,
                                    role_employee: role_employee ? [role_employee] : [],
                                    role_freelancer: role_freelancer ? [role_freelancer] : [],
                                    profile_photo_url: profilePhoto
                                }
                            }
                        })
                    }
                })
                .filter((c): c is NonNullable<typeof c> => c !== null) as Conversation[]
        },
        enabled: !!user?.id,
        refetchOnWindowFocus: true,
    })

    // Fetch active conversation details explicitly
    const { data: activeConversationData, isLoading: isActiveLoading } = useQuery({
        queryKey: ['conversation', activeConversationId],
        queryFn: async () => {
            if (!activeConversationId) return null

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    participants:conversation_participants(
                        user_id,
                        user:users(id, first_name, last_name, role, company_id, email, created_at)
                    )
                `)
                .eq('id', activeConversationId)
                .single()

            if (error) throw error
            const conv = data

            const userIds = (conv.participants.map((p) => p.user_id) || []).filter(Boolean)

            if (userIds.length === 0) return {
                ...conv,
                participants: conv.participants.map(p => ({
                    ...p,
                    user: { ...p.user, role_employee: [] as Participant['user']['role_employee'], role_freelancer: [] as Participant['user']['role_freelancer'] }
                }))
            } as Conversation

            try {
                const [employeesRes, freelancersRes] = await Promise.all([
                    supabase.from('employees').select('id, user_id').in('user_id', userIds),
                    supabase.from('freelancers').select('id, user_id, first_name, last_name, full_name, profile_photo_url').in('user_id', userIds)
                ])

                const employeeMap = new Map(employeesRes.data?.map(e => [e.user_id, e]))
                const freelancerMap = new Map(freelancersRes.data?.map(f => [f.user_id, f]))

                return {
                    ...conv,
                    participants: conv.participants.map((p) => {
                        const role_employee = employeeMap.get(p.user_id)
                        const role_freelancer = freelancerMap.get(p.user_id)

                        let profilePhoto: string | undefined
                        if (conv.type === 'freelancer' && role_freelancer?.profile_photo_url) {
                            profilePhoto = role_freelancer.profile_photo_url
                        }

                        return {
                            ...p,
                            user: {
                                ...p.user,
                                role_employee: role_employee ? [role_employee] : [],
                                role_freelancer: role_freelancer ? [role_freelancer] : [],
                                profile_photo_url: profilePhoto
                            }
                        }
                    })
                } as Conversation
            } catch (err) {
                logger.error('Error fetching role profiles in active conversation:', err)
                return {
                    ...conv,
                    participants: conv.participants.map(p => ({
                        ...p,
                        user: { ...p.user, role_employee: [] as Participant['user']['role_employee'], role_freelancer: [] as Participant['user']['role_freelancer'] }
                    }))
                } as Conversation
            }
        },
        enabled: !!activeConversationId
    })

    // Fetch messages for active conversation
    const { data: messages, isLoading: isMessagesLoading, isError: isMessagesError } = useQuery({
        queryKey: ['messages', activeConversationId],
        queryFn: async () => {
            if (!activeConversationId) return []

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', activeConversationId)
                .order('created_at', { ascending: false })
                .limit(200)

            if (error) throw error
            return (data as Message[]).reverse()
        },
        enabled: !!activeConversationId,
    })

    // Realtime subscriptions
    useEffect(() => {
        if (!user?.id) return
        const channels: ReturnType<typeof supabase.channel>[] = []

        if (activeConversationId) {
            const messagesChannel = supabase
                .channel(`messages_${activeConversationId}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                    () => {
                        queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] })
                        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
                    }
                )
                .subscribe()
            channels.push(messagesChannel)
        }

        const conversationsChannel = supabase
            .channel(`chat_updates_${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
                }
            )
            .subscribe()
        channels.push(conversationsChannel)

        return () => {
            channels.forEach(ch => supabase.removeChannel(ch))
        }
    }, [user?.id, activeConversationId, queryClient])

    const markAsRead = useMutation({
        mutationFn: async (conversationId: string) => {
            if (!user?.id) return
            const { error } = await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
        },
        onError: (error) => {
            logger.error('Failed to mark conversation as read:', error instanceof Error ? error : String(error))
        },
    })

    useEffect(() => {
        if (activeConversationId) {
            markAsRead.mutate(activeConversationId)
        }
    }, [activeConversationId])

    const sendMessage = useMutation({
        mutationFn: async ({ content, conversationId }: { content: string, conversationId: string }) => {
            if (!user?.id) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    content,
                    sender_id: user.id
                })
                .select()
                .single()

            if (error) throw error

            await supabase
                .from('conversation_participants')
                .update({ hidden_at: null })
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] })
            queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
        },
        onError: (error) => {
            toast.error(i18n.t('chat.sendError'))
            logger.error('Failed to send message:', error instanceof Error ? error : String(error))
        },
    })

    const createConversation = useMutation({
        mutationFn: async ({ participantId, type }: { participantId: string, type: 'employee' | 'freelancer' }) => {
            if (!user?.id) throw new Error('Not authenticated')

            const { data: existingConvs, error: findError } = await supabase
                .from('conversations')
                .select(`
                    id,
                    type,
                    participants:conversation_participants(user_id)
                `)
                .eq('type', type)

            if (findError) throw findError

            const matchingConv = (existingConvs || []).find(conv => {
                const pIds = conv.participants?.map((p: { user_id: string }) => p.user_id) || []
                return pIds.length === 2 && pIds.includes(user.id) && pIds.includes(participantId)
            })

            if (matchingConv) {
                await supabase
                    .from('conversation_participants')
                    .update({ hidden_at: null })
                    .eq('conversation_id', matchingConv.id)
                    .eq('user_id', user.id)

                return matchingConv
            }

            const { data: conv, error: convError } = await supabase
                .from('conversations')
                .insert({
                    created_by: user.id,
                    type: type
                })
                .select()
                .single()

            if (convError) throw convError

            const { error: partError } = await supabase
                .from('conversation_participants')
                .insert([
                    { conversation_id: conv.id, user_id: user.id },
                    { conversation_id: conv.id, user_id: participantId }
                ])

            if (partError) throw partError

            return conv
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
        },
        onError: (error) => {
            toast.error(i18n.t('chat.createConversationError'))
            logger.error('Failed to create conversation:', error instanceof Error ? error : String(error))
        },
    })

    const deleteConversation = useMutation({
        mutationFn: async (id: string) => {
            if (!user?.id) return
            const { error } = await supabase
                .from('conversation_participants')
                .update({ hidden_at: new Date().toISOString() })
                .eq('conversation_id', id)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['conversations', user?.id] })
            const previousConversations = queryClient.getQueryData(['conversations', user?.id])

            queryClient.setQueryData(['conversations', user?.id], (old: Conversation[] = []) => {
                return old.filter(c => c.id !== id)
            })

            return { previousConversations }
        },
        onError: (err, id, context) => {
            if (context?.previousConversations) {
                queryClient.setQueryData(['conversations', user?.id], context.previousConversations)
            }
            toast.error(i18n.t('chat.deleteConversationError', { defaultValue: 'Erreur lors de la suppression' }))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
        }
    })

    const blockUser = useMutation({
        mutationFn: async (blockedUserId: string) => {
            if (!user?.id) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('user_blocks')
                .insert({
                    blocker_id: user.id,
                    blocked_id: blockedUserId
                })

            if (error) throw error
            return blockedUserId
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
        },
        onError: (error) => {
            toast.error(i18n.t('chat.blockError'))
            logger.error('Failed to block user:', error instanceof Error ? error : String(error))
        },
    })

    const activeConversation = useMemo(() =>
        activeConversationId
            ? ((conversations || []).find(c => c.id === activeConversationId) || activeConversationData)
            : undefined,
        [activeConversationId, conversations, activeConversationData]
    )

    // Check messaging permissions (Freelancer <-> Employer only if accepted application exists)
    const { data: canMessage } = useQuery({
        queryKey: ['canMessage', activeConversation?.id, user?.id],
        queryFn: async () => {
            if (!activeConversation || !user) return false

            const otherParticipant = activeConversation.participants.find(p => p.user_id !== user.id)
            if (!otherParticipant) return false

            const myRole = user.role
            const otherRole = otherParticipant.user.role

            // Emp <-> Emp: blocked
            if (myRole === 'employee' && otherRole === 'employee') return false

            // Free <-> Free: blocked
            if (myRole === 'freelance' && otherRole === 'freelance') return false

            // Freelancer <-> Company: check for accepted application
            const isFreelancerInvolved = myRole === 'freelance' || otherRole === 'freelance'
            const isCompanyInvolved = ['admin', 'manager', 'employee'].includes(myRole) || ['admin', 'manager', 'employee'].includes(otherRole)

            if (isFreelancerInvolved && isCompanyInvolved) {
                const freelancerUserId = myRole === 'freelance' ? user.id : otherParticipant.user_id
                const companyUser = myRole === 'freelance' ? otherParticipant.user : user
                const companyId = companyUser.company_id

                if (!companyId) return false

                const { data: freelancer } = await supabase
                    .from('freelancers')
                    .select('id')
                    .eq('user_id', freelancerUserId)
                    .single()

                if (!freelancer) return false

                const { data: applications, error } = await supabase
                    .from('shift_freelancer_applications')
                    .select(`
                        id,
                        status,
                        shift:shifts(id, status, company_id)
                    `)
                    .eq('freelancer_id', freelancer.id)
                    .eq('status', 'accepted')

                if (error) {
                    logger.error('Error checking applications:', error)
                    return false
                }

                return (applications || []).some(app =>
                    app.shift?.company_id === companyId &&
                    ['pending', 'filled', 'partially_filled'].includes(app.shift?.status ?? '')
                )
            }

            // Admin/Manager <-> Employee: allowed
            return true
        },
        enabled: !!activeConversation && !!user,
    })

    const totalUnreadCount = useMemo(() => (conversations || []).reduce((acc, conv) => acc + (conv.unread_count || 0), 0), [conversations])

    return {
        conversations,
        totalUnreadCount,
        activeConversation,
        messages,
        sendMessage,
        createConversation,
        deleteConversation,
        blockUser,
        isLoading: isConversationsLoading || isMessagesLoading || isActiveLoading,
        isError: isConversationsError || isMessagesError,
        canMessage: canMessage ?? false
    }
}