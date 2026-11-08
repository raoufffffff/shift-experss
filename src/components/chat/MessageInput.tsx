import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface MessageInputProps {
    onSend: (content: string) => void
    disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
    const { t } = useTranslation()
    const [content, setContent] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSend = () => {
        if (!content.trim()) return
        onSend(content)
        setContent('')
        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, [content])

    return (
        <div className="p-4 bg-transparent sticky bottom-0 z-20">
            <div className="max-w-4xl mx-auto flex items-end gap-3 bg-card/80 backdrop-blur-2xl border border-border p-2 rounded-[24px] shadow-sm transition-all focus-within:bg-card focus-within:border-primary/30">
                {/* Input Area */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.typePlaceholder')}
                    disabled={disabled}
                    className="flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-40 min-h-[44px] py-3 px-1 text-sm text-foreground placeholder:text-muted-foreground selection:bg-primary/30 font-medium"
                    rows={1}
                />

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={disabled || !content.trim()}
                    className={cn(
                        "p-3 rounded-2xl transition-all shrink-0 active:scale-90",
                        content.trim()
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 opacity-100"
                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                    )}
                >
                    <Send className={cn("w-5 h-5 transition-transform", content.trim() && "translate-x-0.5 -translate-y-px")} />
                </button>
            </div>
        </div>
    )
}
