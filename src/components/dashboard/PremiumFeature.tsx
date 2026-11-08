import { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'

interface PremiumFeatureProps {
    children: ReactNode
    featureName: string
    isLocked?: boolean
}

export function PremiumFeature({ children, featureName, isLocked = false }: PremiumFeatureProps) {
    if (!isLocked) {
        return <>{children}</>
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-zinc-800/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 flex flex-col items-center max-w-sm mx-auto"
            >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg mb-4">
                    <Lock className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-base font-semibold text-foreground mb-2">
                    {featureName}
                </h3>

                <p className="text-sm text-muted-foreground mb-6">
                    Cette fonctionnalité est disponible uniquement pour les plans Premium et Enterprise.
                </p>

                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-orange-500/20">
                    Passer au plan supérieur
                </Button>
            </motion.div>
        </div>
    )
}
