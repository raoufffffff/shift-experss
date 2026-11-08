export interface Conversation {
    id: string
    type: 'employee' | 'freelancer'
    created_at: string
    updated_at: string
    participants: Participant[]
    last_message?: Message
    unread_count?: number
    created_by: string
}

export interface Participant {
    user_id: string
    last_read_at?: string
    hidden_at?: string
    user: {
        id: string
        first_name: string
        last_name: string
        role: string
        company_id?: string | null
        avatar_url?: string
        profile_photo_url?: string
        email?: string
        created_at?: string
        role_employee?: { id: string; user_id: string }[]
        role_freelancer?: { id: string; user_id: string | null; first_name: string; last_name: string; full_name: string | null; profile_photo_url: string | null }[]
    }
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    created_at: string
}

export interface SendMessageDTO {
    conversation_id: string
    content: string
}

export interface CreateConversationDTO {
    participant_ids: string[]
}
