// Registros "por validar": los creó una importación de Excel y aún no los revisa una persona.
// Piezas compartidas por los catálogos (materiales, proveedores, componentes, equipos):
// etiqueta, filtro "solo por validar" y validación (individual o de todos los mostrados).
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { validarRegistros } from '../api/ImportacionesAPI'
import { IconCheck } from './icons'

type ModuloValidable = 'materiales' | 'proveedores' | 'componentes' | 'equipos'

export function BadgePorValidar() {
    return (
        <span
            className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-800"
            title="Creado por una importación de Excel; falta que alguien lo revise"
        >
            Por validar
        </span>
    )
}

// Estado del filtro (arranca activo si la URL trae ?porValidar=1) + validación
export function usePorValidar<T extends { _id: string; porValidar?: boolean }>(modulo: ModuloValidable, lista: T[]) {
    const [params] = useSearchParams()
    const [solo, setSolo] = useState(params.get('porValidar') === '1')
    const queryClient = useQueryClient()
    const pendientes = lista.filter((x) => x.porValidar).length
    const validar = useMutation({
        mutationFn: (ids: string[]) => validarRegistros(modulo, ids),
        onSuccess: (r) => {
            toast.success(r.mensaje)
            queryClient.invalidateQueries({ queryKey: [modulo] })
        },
        onError: (e: Error) => toast.error(e.message),
    })
    return {
        solo: solo && pendientes > 0,
        setSolo,
        pendientes,
        filtrar: (xs: T[]) => (solo && pendientes > 0 ? xs.filter((x) => x.porValidar) : xs),
        validar,
    }
}

// Chip de filtro + "validar todos los mostrados" (solo aparece si hay pendientes)
export function FiltroPorValidar({
    pendientes,
    solo,
    onSolo,
    mostrados,
    onValidarTodos,
    puedeValidar,
    validando,
}: {
    pendientes: number
    solo: boolean
    onSolo: (v: boolean) => void
    mostrados: number
    onValidarTodos: () => void
    puedeValidar: boolean
    validando: boolean
}) {
    if (pendientes === 0) return null
    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => onSolo(!solo)}
                aria-pressed={solo}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    solo ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
            >
                Por validar ({pendientes})
            </button>
            {solo && puedeValidar && mostrados > 0 && (
                <button
                    onClick={() => {
                        if (confirm(`¿Marcar como validados los ${mostrados} registros mostrados? Hazlo solo si ya los revisaste.`)) onValidarTodos()
                    }}
                    disabled={validando}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                    <IconCheck width={14} height={14} /> Validar los {mostrados} mostrados
                </button>
            )}
        </div>
    )
}

// Botón de fila: marca un registro como revisado
export function BotonValidar({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="rounded-md p-2 text-amber-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
            title="Marcar como validado (ya lo revisé)"
            aria-label="Marcar como validado"
        >
            <IconCheck />
        </button>
    )
}
