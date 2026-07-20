import { useEffect, type ReactNode } from 'react'
import { IconClose } from './icons'

// Modal reutilizable — único componente de diálogo del sistema.
export function Modal({
    open,
    onClose,
    titulo,
    children,
    ancho = 'max-w-lg',
}: {
    open: boolean
    onClose: () => void
    titulo: string
    children: ReactNode
    ancho?: string
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (open) document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 backdrop-blur-sm">
            <div className={`mt-10 w-full ${ancho} rounded-xl bg-white shadow-2xl`}>
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="font-display text-lg font-bold text-navy-900">{titulo}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Cerrar"
                    >
                        <IconClose />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    )
}
