// Select con buscador (combobox) para elegir entre MUCHOS registros: materiales, componentes,
// proveedores... Para listas cortas y fijas (estado, rol, unidad) se sigue usando el <Select> nativo.
//  - Busca sin importar acentos ni mayúsculas, por varias palabras a la vez ("placa 1/2") y
//    también en el texto secundario (`detalle`, p. ej. la clave o el RFC).
//  - Teclado: ↓/↑ para moverse, Enter para elegir, Esc para cerrar; escribir sobre el control lo abre.
//  - La lista se pinta en un portal con posición fija: no la recortan los modales con scroll.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconChevronDown, IconSearch } from './icons'

export interface OpcionBuscable {
    value: string
    label: string
    detalle?: string // texto secundario (también se busca en él)
    disabled?: boolean
}

interface Props {
    value: string
    onChange: (value: string) => void
    opciones: OpcionBuscable[]
    placeholder?: string
    // Si se indica, aparece como primera opción con valor '' (p. ej. "Todos los materiales")
    vacio?: string
    disabled?: boolean
    invalido?: boolean
    className?: string
    id?: string
    onBlur?: () => void
    'aria-label'?: string
}

// Máximo de renglones pintados a la vez (con miles de registros se pide afinar la búsqueda)
const MAX_VISIBLES = 150
const ALTO_LISTA = 288 // px (max-h-72)

// Normaliza carácter por carácter (quita acentos, minúsculas) para poder resaltar por índice
function normalizar(s: string) {
    return Array.from(s)
        .map((c) => {
            const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            return n.length === 1 ? n : c.toLowerCase().charAt(0)
        })
        .join('')
}

function Resaltado({ texto, terminos }: { texto: string; terminos: string[] }) {
    const t = terminos.find((x) => x && normalizar(texto).includes(x))
    if (!t) return <>{texto}</>
    const i = normalizar(texto).indexOf(t)
    return (
        <>
            {texto.slice(0, i)}
            <mark className="rounded-sm bg-amber-100 px-0.5 text-inherit">{texto.slice(i, i + t.length)}</mark>
            {texto.slice(i + t.length)}
        </>
    )
}

export function SelectBuscable({
    value,
    onChange,
    opciones,
    placeholder = 'Selecciona…',
    vacio,
    disabled,
    invalido,
    className = '',
    id,
    onBlur,
    'aria-label': ariaLabel,
}: Props) {
    const uid = useId()
    const listaId = `${uid}-lista`
    const triggerRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const listaRef = useRef<HTMLUListElement>(null)
    const buscarRef = useRef<HTMLInputElement>(null)

    const [abierto, setAbierto] = useState(false)
    const [query, setQuery] = useState('')
    const [activo, setActivo] = useState(0)
    const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number }>({ left: 0, width: 0 })

    const seleccionada = opciones.find((o) => o.value === value)
    const terminos = useMemo(() => normalizar(query).split(/\s+/).filter(Boolean), [query])

    // Opciones que coinciden (todas las palabras deben aparecer en label o detalle)
    const coincidencias = useMemo(() => {
        const base: OpcionBuscable[] = vacio !== undefined && terminos.length === 0 ? [{ value: '', label: vacio }] : []
        const filtradas =
            terminos.length === 0
                ? opciones
                : opciones.filter((o) => {
                      const txt = normalizar(`${o.label} ${o.detalle ?? ''}`)
                      return terminos.every((t) => txt.includes(t))
                  })
        return [...base, ...filtradas]
    }, [opciones, terminos, vacio])
    const visibles = coincidencias.slice(0, MAX_VISIBLES)

    // ---------- posición del panel (fixed, se voltea hacia arriba si no cabe) ----------
    const reubicar = () => {
        const r = triggerRef.current?.getBoundingClientRect()
        if (!r) return
        const ancho = Math.max(r.width, 280)
        const left = Math.min(r.left, window.innerWidth - ancho - 8)
        const abajo = window.innerHeight - r.bottom
        const necesita = ALTO_LISTA + 64
        if (abajo < necesita && r.top > abajo) setPos({ left, width: ancho, bottom: window.innerHeight - r.top + 4 })
        else setPos({ left, width: ancho, top: r.bottom + 4 })
    }
    useLayoutEffect(() => {
        if (!abierto) return
        reubicar()
        const on = () => reubicar()
        window.addEventListener('resize', on)
        window.addEventListener('scroll', on, true) // true: también el scroll de <main> y de los modales
        return () => {
            window.removeEventListener('resize', on)
            window.removeEventListener('scroll', on, true)
        }
    }, [abierto])

    // Cerrar al hacer clic fuera
    useEffect(() => {
        if (!abierto) return
        const on = (e: MouseEvent) => {
            const t = e.target as Node
            if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) cerrar(false)
        }
        document.addEventListener('mousedown', on)
        return () => document.removeEventListener('mousedown', on)
    })

    // Mantener visible el renglón activo
    useEffect(() => {
        if (!abierto) return
        listaRef.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: 'nearest' })
    }, [activo, abierto])

    const primeraHabilitada = (lista: OpcionBuscable[], desde = 0, paso = 1) => {
        for (let i = desde; i >= 0 && i < lista.length; i += paso) if (!lista[i].disabled) return i
        return -1
    }

    const abrir = (textoInicial = '') => {
        if (disabled) return
        setQuery(textoInicial)
        setAbierto(true)
        // Arranca sobre la opción elegida (si está a la vista) o sobre la primera
        const idx = textoInicial ? -1 : coincidencias.findIndex((o) => o.value === value)
        setActivo(idx >= 0 ? idx : 0)
        requestAnimationFrame(() => buscarRef.current?.focus())
    }

    const cerrar = (devolverFoco = true) => {
        setAbierto(false)
        setQuery('')
        if (devolverFoco) triggerRef.current?.focus()
        onBlur?.()
    }

    const elegir = (o: OpcionBuscable) => {
        if (o.disabled) return
        onChange(o.value)
        cerrar()
    }

    const onKeyTrigger = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault()
            abrir()
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Empezar a escribir sobre el control abre el buscador con esa letra
            e.preventDefault()
            abrir(e.key)
        }
    }

    const onKeyBuscar = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const n = primeraHabilitada(visibles, activo + 1, 1)
            if (n >= 0) setActivo(n)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const n = primeraHabilitada(visibles, activo - 1, -1)
            if (n >= 0) setActivo(n)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const o = visibles[activo]
            if (o) elegir(o)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            // Que Esc cierre solo la lista y no también el modal que la contiene
            e.stopPropagation()
            cerrar()
        } else if (e.key === 'Tab') {
            cerrar(false)
        }
    }

    const etiqueta: ReactNode = seleccionada ? (
        <span className="truncate">
            {seleccionada.label}
            {seleccionada.detalle && <span className="ml-1.5 text-slate-400">{seleccionada.detalle}</span>}
        </span>
    ) : value === '' && vacio !== undefined ? (
        <span className="truncate">{vacio}</span>
    ) : (
        <span className="truncate text-slate-400">{placeholder}</span>
    )

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-controls={listaId}
                aria-label={ariaLabel}
                aria-invalid={invalido || undefined}
                disabled={disabled}
                onClick={() => (abierto ? cerrar() : abrir())}
                onKeyDown={onKeyTrigger}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
                    invalido ? 'border-red-400' : 'border-slate-300'
                } ${className}`}
            >
                {etiqueta}
                <IconChevronDown
                    width={16}
                    height={16}
                    className={`flex-shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
                />
            </button>

            {abierto &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
                        className="z-[60] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                    >
                        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                            <IconSearch width={16} height={16} className="flex-shrink-0 text-slate-400" />
                            <input
                                ref={buscarRef}
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setActivo(0)
                                }}
                                onKeyDown={onKeyBuscar}
                                placeholder="Buscar…"
                                aria-label="Buscar opción"
                                aria-controls={listaId}
                                aria-activedescendant={visibles[activo] ? `${uid}-op-${activo}` : undefined}
                                className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                            />
                            {query && (
                                <span className="flex-shrink-0 text-xs text-slate-400">{coincidencias.length}</span>
                            )}
                        </div>

                        <ul ref={listaRef} id={listaId} role="listbox" className="max-h-72 overflow-y-auto py-1">
                            {visibles.length === 0 && (
                                <li className="px-3 py-6 text-center text-sm text-slate-400">Sin resultados para “{query}”</li>
                            )}
                            {visibles.map((o, i) => {
                                const sel = o.value === value
                                return (
                                    <li
                                        key={`${o.value}-${i}`}
                                        id={`${uid}-op-${i}`}
                                        data-i={i}
                                        role="option"
                                        aria-selected={sel}
                                        aria-disabled={o.disabled || undefined}
                                        onMouseEnter={() => !o.disabled && setActivo(i)}
                                        // mousedown (no click) para elegir antes de que el input pierda el foco
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            elegir(o)
                                        }}
                                        className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                                            o.disabled
                                                ? 'cursor-not-allowed text-slate-300'
                                                : i === activo
                                                  ? 'bg-brand-50 text-brand-800'
                                                  : 'text-slate-700'
                                        }`}
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            <Resaltado texto={o.label} terminos={terminos} />
                                            {o.detalle && (
                                                <span className="ml-1.5 text-xs text-slate-400">
                                                    <Resaltado texto={o.detalle} terminos={terminos} />
                                                </span>
                                            )}
                                        </span>
                                        {sel && <IconCheck width={16} height={16} className="flex-shrink-0 text-brand-600" />}
                                    </li>
                                )
                            })}
                        </ul>

                        {coincidencias.length > MAX_VISIBLES && (
                            <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
                                Mostrando {MAX_VISIBLES} de {coincidencias.length} · escribe para afinar
                            </p>
                        )}
                    </div>,
                    document.body
                )}
        </>
    )
}
