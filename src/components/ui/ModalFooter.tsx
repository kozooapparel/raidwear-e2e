'use client'

interface ModalFooterProps {
    onCancel: () => void
    cancelText?: string
    submitText?: string
    loading?: boolean
    variant?: 'primary' | 'danger' | 'warning'
    type?: 'submit' | 'button'
    onSubmit?: () => void
    disabled?: boolean
}

const variantClasses = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
}

export function ModalFooter({
    onCancel,
    cancelText = 'Batal',
    submitText = 'Simpan',
    loading = false,
    variant = 'primary',
    type = 'submit',
    onSubmit,
    disabled = false,
}: ModalFooterProps) {
    return (
        <div className="flex gap-3 pt-2">
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
                {cancelText}
            </button>
            <button
                type={type}
                onClick={type === 'button' ? onSubmit : undefined}
                disabled={loading || disabled}
                className={`flex-1 py-2.5 px-4 rounded-xl ${variantClasses[variant]} font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menyimpan...
                    </>
                ) : (
                    submitText
                )}
            </button>
        </div>
    )
}
