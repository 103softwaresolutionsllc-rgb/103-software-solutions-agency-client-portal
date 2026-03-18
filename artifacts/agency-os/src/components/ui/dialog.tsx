import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ isOpen, onClose, title, description, children, className }: DialogProps) {
  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-2xl glass-card p-6 shadow-2xl z-10",
              className
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-display text-foreground">{title}</h2>
              {description && (
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
