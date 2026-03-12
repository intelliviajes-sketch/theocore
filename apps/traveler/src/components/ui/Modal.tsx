'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

type Props = {
    open: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    wide?: boolean
}

export default function Modal({ open, onClose, title, children, wide }: Props) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'
                            } mx-4`}
                    >
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{title}</h3>
                            <button
                                onClick={onClose}
                                className="rounded-xl px-3 py-1 text-sm hover:bg-gray-100"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-5">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
