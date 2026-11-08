import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/cn'
import { ReactNode } from 'react'

interface BentoCardProps extends HTMLMotionProps<'div'> {
    children: ReactNode
    className?: string
    noPadding?: boolean
}

export function BentoCard({ children, className, noPadding = false, ...props }: BentoCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                "bg-card",
                "rounded-xl",
                "border border-border/60",
                "shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5",
                "overflow-hidden relative",
                "transition-all duration-300",
                noPadding ? "p-0" : "p-4 sm:p-6",
                className
            )}
            {...props}
        >
            {/* Subtle shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/40 dark:to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {children}
        </motion.div>
    )
}
