import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Upload, X, Loader2, FileText, CheckCircle2, AlertCircle, FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'

// Magic bytes signatures for allowed file types
const MAGIC_BYTES: Record<string, number[][]> = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/jpg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]], // .PNG
}

async function validateMagicBytes(file: File, allowedTypes: string[]): Promise<boolean> {
    const maxLen = 4
    const buffer = await file.slice(0, maxLen).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    return allowedTypes.some((type) => {
        const signatures = MAGIC_BYTES[type]
        if (!signatures) return true // No signature to check — allow
        return signatures.some((sig) => sig.every((b, i) => bytes[i] === b))
    })
}

interface FileUploadProps {
    value?: string | null
    onChange: (url: string | null) => void
    bucket?: string
    folder?: string
    className?: string
    allowedTypes?: string[]
    maxSizeMB?: number
    label?: string
}

export function FileUpload({
    value,
    onChange,
    bucket = 'company-documents',
    folder = '',
    className,
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    maxSizeMB = 5,
    label
}: FileUploadProps) {
    const { t } = useTranslation()
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(t('common.fileTooLarge', {
                defaultValue: `Le fichier est trop volumineux (max ${maxSizeMB}Mo)`,
                size: maxSizeMB
            }))
            return
        }

        // Validate MIME type
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('common.invalidFileType', {
                defaultValue: 'Format non supporté. Utilisez PDF, JPG ou PNG.'
            }))
            return
        }

        // Validate magic bytes (prevents spoofed extensions)
        const validBytes = await validateMagicBytes(file, allowedTypes)
        if (!validBytes) {
            toast.error(t('common.invalidFileType', {
                defaultValue: 'Format non supporté. Utilisez PDF, JPG ou PNG.'
            }))
            return
        }

        try {
            setIsUploading(true)

            const fileExt = file.name.split('.').pop()
            const fileName = `${folder ? folder + '/' : ''}${crypto.randomUUID()}_${Date.now()}.${fileExt}`
            const filePath = fileName

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            onChange(publicUrl)
            toast.success(t('common.uploadSuccess', { defaultValue: 'Document téléchargé avec succès' }))
        } catch (error) {
            console.error('Error uploading file:', error)
            toast.error(t('common.uploadFailed', { defaultValue: 'Échec du téléchargement' }))
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemove = () => {
        onChange(null)
    }

    const getFileName = (url: string) => {
        try {
            const decoded = decodeURIComponent(url)
            return decoded.split('/').pop()?.split('_').slice(1).join('_') || 'document'
        } catch {
            return 'document'
        }
    }

    const isImage = value?.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i)

    return (
        <div className={cn("group/upload space-y-2", className)}>
            {label && (
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
                    {label}
                </label>
            )}

            <div className="flex flex-col gap-3">
                <div
                    className={cn(
                        "relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl overflow-hidden bg-muted/20 dark:bg-muted/10 transition-all duration-300 min-h-[100px]",
                        "hover:border-primary/60 hover:bg-muted/30 dark:hover:bg-muted/20 active:scale-[0.99]",
                        !value && !isUploading && "cursor-pointer",
                        isUploading && "opacity-70 cursor-not-allowed",
                        value && "border-solid border-primary/20 bg-primary/5 dark:bg-primary/10"
                    )}
                    onClick={() => !value && !isUploading && fileInputRef.current?.click()}
                >
                    {value ? (
                        <div className="w-full p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                    {isImage ? <FileIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                                        {getFileName(value)}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-tighter">{t('fileUpload.readyToSend')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                >
                                    {t('fileUpload.change')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-6">
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/upload:bg-primary group-hover/upload:text-white transition-all duration-300">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-semibold text-foreground block">
                                            {t('fileUpload.uploadDocument')}
                                        </span>
                                        <div className="flex items-center justify-center gap-2">
                                            <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 font-bold border-border bg-background/50 dark:bg-muted/50 text-muted-foreground uppercase tracking-wider">
                                                PDF, JPG, PNG
                                            </Badge>
                                            <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 font-bold border-border bg-background/50 dark:bg-muted/50 text-muted-foreground uppercase tracking-wider">
                                                {t('fileUpload.maxSize', { size: maxSizeMB })}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept={allowedTypes.join(',')}
                className="hidden"
            />
        </div>
    )
}
