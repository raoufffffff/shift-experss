
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function DashboardContentV2({ children }: { children: ReactNode }) {
    return (
        <div className="max-w-[1400px] mx-auto space-y-8 p-6">
            {/* Introduction animée */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {children}
            </motion.div>
        </div>
    )
}
