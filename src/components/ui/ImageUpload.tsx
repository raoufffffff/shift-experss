import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Upload, X, Loader2, Image as ImageIcon, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'

// Magic bytes signatures for allowed image types
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/jpg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
}

async function validateImageMagicBytes(file: File, allowedTypes: string[]): Promise<boolean> {
    const buffer = await file.slice(0, 4).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    return allowedTypes.some((type) => {
        const signatures = IMAGE_MAGIC_BYTES[type]
        if (!signatures) return true
        return signatures.some((sig) => sig.every((b, i) => bytes[i] === b))
    })
}

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string | null) => void
    bucket?: string
    folder?: string
    className?: string
    aspectRatio?: 'square' | 'video' | 'any'
}

export function ImageUpload({
    value,
    onChange,
    bucket = 'logos',
    folder = '',
    className,
    aspectRatio = 'square'
}: ImageUploadProps) {
    const { t } = useTranslation()
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error(t('common.fileTooLarge', { defaultValue: 'Le fichier est trop volumineux (max 2Mo)' }))
            return
        }

        // Validate MIME type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('common.invalidFileType', { defaultValue: 'Format non supporté. Utilisez JPG, PNG ou WEBP.' }))
            return
        }

        // Validate magic bytes (prevents spoofed extensions)
        const validBytes = await validateImageMagicBytes(file, allowedTypes)
        if (!validBytes) {
            toast.error(t('common.invalidFileType', { defaultValue: 'Format non supporté. Utilisez JPG, PNG ou WEBP.' }))
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
            toast.success(t('common.uploadSuccess', { defaultValue: 'Image téléchargée avec succès' }))
        } catch (error) {
            console.error('Error uploading image:', error)
            toast.error(t('common.uploadFailed', { defaultValue: 'Échec du téléchargement' }))
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemove = () => {
        onChange(null)
    }

    return (
        <div className={cn("group/upload space-y-2", className)}>
            <div className="flex items-start gap-4">
                <div
                    className={cn(
                        "relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl overflow-hidden bg-muted/30 transition-all duration-300",
                        "hover:border-primary/60 hover:bg-muted/50 active:scale-[0.98]",
                        aspectRatio === 'square' ? "w-28 h-28" : "w-full aspect-video",
                        !value && !isUploading && "cursor-pointer",
                        isUploading && "opacity-70 cursor-not-allowed",
                        value && "border-solid border-primary/20"
                    )}
                    onClick={() => !value && !isUploading && fileInputRef.current?.click()}
                >
                    {value ? (
                        <>
                            <img
                                src={value}
                                alt="Uploaded image"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            {/* Overlay on hover when value exists */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-white hover:bg-white/90 text-black border-none"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                >
                                    <Upload className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full shadow-lg"
                                    onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-4">
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/upload:bg-primary group-hover/upload:text-white transition-colors duration-300">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-semibold text-foreground block">
                                            {t('common.upload', { defaultValue: 'Ajouter' })}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                                            PNG, JPG or WEBP
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-2.5 py-1">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-foreground">
                            {value ? t('common.changeImage', { defaultValue: 'Changer l\'image' }) : t('common.uploadImage', { defaultValue: 'Télécharger une image' })}
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {t('common.uploadDescription', { defaultValue: 'Pour un meilleur rendu, utilisez une image carrée de 512x512px minimum.' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-medium border-border/60 bg-muted/30 text-muted-foreground uppercase tracking-wider">
                            Max 2Mo
                        </Badge>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
            />
        </div>
    )
}
