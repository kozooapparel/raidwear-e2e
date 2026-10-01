'use client'

import { useEffect, useCallback } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    // Handle escape key
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }, [onClose])

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, handleEscape])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal — tanpa overflow-hidden agar dropdown di dalamnya tidak terpotong */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    )
}

// Header variant for different title colors (e.g., for delete modals)
interface ModalHeaderProps {
    title: string
    onClose: () => void
    variant?: 'default' | 'danger'
}

export function ModalHeader({ title, onClose, variant = 'default' }: ModalHeaderProps) {
    const titleColors = {
        default: 'text-slate-900',
        danger: 'text-red-600',
    }

    return (
        <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${titleColors[variant]}`}>{title}</h2>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
