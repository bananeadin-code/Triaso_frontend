import { useEffect } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { CategoriaId } from '../types'
import { IconSearch } from './icons'

// ---------- Buscador ----------
export function Buscador({
    value,
    onChange,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    return (
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm sm:max-w-xs">
            <IconSearch className="flex-shrink-0 text-slate-400" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
        </div>
    )
}

// ---------- Botón ----------
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
        />
    )
}

// ---------- Barra de guardado fija (abajo) ----------
// Para editores largos (componentes, composición del BOM): el botón de guardar queda siempre
// a la vista aunque se haga scroll. Muestra si hay cambios pendientes y acepta Ctrl/Cmd+S.
export function BarraGuardado({
    hayCambios,
    guardando,
    onGuardar,
    onDescartar,
    etiqueta = 'Guardar cambios',
}: {
    hayCambios: boolean
    guardando: boolean
    onGuardar: () => void
    onDescartar?: () => void
    etiqueta?: string
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                if (hayCambios && !guardando) onGuardar()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [hayCambios, guardando, onGuardar])

    return (
        <div
            role="region"
            aria-label="Guardar cambios"
            className={`sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 shadow-lg backdrop-blur transition-colors ${
                hayCambios ? 'border-amber-200 bg-amber-50/95' : 'border-slate-200 bg-white/95'
            }`}
        >
            <div className="flex items-center gap-2 text-sm" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${hayCambios ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {hayCambios ? (
                    <span className="font-medium text-amber-700">Cambios sin guardar</span>
                ) : (
                    <span className="text-slate-500">Todo guardado</span>
                )}
                <span className="hidden text-xs text-slate-400 sm:inline">· Ctrl+S para guardar</span>
            </div>
            <div className="flex items-center gap-2">
                {onDescartar && hayCambios && (
                    <Button variant="ghost" onClick={onDescartar} disabled={guardando}>
                        Descartar
                    </Button>
                )}
                <Button onClick={onGuardar} disabled={guardando || !hayCambios}>
                    {guardando ? 'Guardando…' : etiqueta}
                </Button>
            </div>
        </div>
    )
}

// ---------- Campo (label + control + error) ----------
export function Field({
    label,
    error,
    required,
    children,
}: {
    label: string
    error?: string
    required?: boolean
    children: ReactNode
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            {children}
            {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
        </label>
    )
}

const controlBase =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`${controlBase} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`${controlBase} ${props.className ?? ''}`} />
}

// ---------- Badge de rol ----------
export function Badge({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            {children}
        </span>
    )
}

// ---------- Badge de categoría (color por id; A-E fijos, resto por paleta) ----------
const CAT_COLOR: Record<string, string> = {
    A: 'bg-orange-100 text-orange-800 ring-orange-200',
    B: 'bg-teal-100 text-teal-800 ring-teal-200',
    C: 'bg-violet-100 text-violet-800 ring-violet-200',
    D: 'bg-blue-100 text-blue-800 ring-blue-200',
    E: 'bg-pink-100 text-pink-800 ring-pink-200',
}
const CAT_PALETA = [
    'bg-amber-100 text-amber-800 ring-amber-200',
    'bg-emerald-100 text-emerald-800 ring-emerald-200',
    'bg-cyan-100 text-cyan-800 ring-cyan-200',
    'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
    'bg-lime-100 text-lime-800 ring-lime-200',
    'bg-rose-100 text-rose-800 ring-rose-200',
    'bg-indigo-100 text-indigo-800 ring-indigo-200',
    'bg-sky-100 text-sky-800 ring-sky-200',
]
function colorCategoria(id: string): string {
    if (CAT_COLOR[id]) return CAT_COLOR[id]
    let h = 0
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return CAT_PALETA[h % CAT_PALETA.length]
}

export function CategoriaBadge({ id, title }: { id: CategoriaId; title?: string }) {
    return (
        <span
            title={title}
            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-bold ring-1 ${colorCategoria(id)}`}
        >
            {id}
        </span>
    )
}

// ---------- Spinner ----------
export function Spinner({ label }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
            {label && <span className="text-sm">{label}</span>}
        </div>
    )
}

// ---------- Estado vacío ----------
export function EmptyState({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
            <p className="text-sm font-semibold text-slate-700">{titulo}</p>
            {descripcion && <p className="text-sm text-slate-500">{descripcion}</p>}
        </div>
    )
}

// ---------- Encabezado de página ----------
export function PageHeader({
    titulo,
    descripcion,
    accion,
}: {
    titulo: string
    descripcion?: string
    accion?: ReactNode
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
                <h1 className="font-display text-xl font-bold text-navy-900 sm:text-2xl">{titulo}</h1>
                {descripcion && <p className="mt-1 text-sm text-slate-500">{descripcion}</p>}
            </div>
            {accion && <div className="flex-shrink-0">{accion}</div>}
        </div>
    )
}
