// Paginación de tablas: control visual + hooks.
//  - Catálogos (materiales, proveedores…): la lista completa ya viene del servidor (los selects
//    con buscador la necesitan entera), así que se pagina EN PANTALLA con usePaginacionLocal.
//  - Documentos que crecen sin fin (cotizaciones, órdenes): el SERVIDOR filtra y pagina.
import { useEffect, useMemo, useState } from 'react'

export const POR_PAGINA = 25

export function Paginacion({
    pagina,
    paginas,
    total,
    limite,
    onPagina,
}: {
    pagina: number
    paginas: number
    total: number
    limite: number
    onPagina: (p: number) => void
}) {
    if (total <= limite) return null
    const desde = (pagina - 1) * limite + 1
    const hasta = Math.min(pagina * limite, total)
    // Números visibles: primera, última y dos alrededor de la actual
    const nums = [...new Set([1, pagina - 1, pagina, pagina + 1, paginas])].filter((n) => n >= 1 && n <= paginas).sort((a, b) => a - b)
    const boton = 'min-w-9 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'
    return (
        <nav
            aria-label="Paginación"
            className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row"
        >
            <span className="text-slate-500">
                Mostrando <strong className="text-slate-700">{desde}–{hasta}</strong> de <strong className="text-slate-700">{total}</strong>
            </span>
            <div className="flex items-center gap-1">
                <button className={`${boton} text-slate-600 hover:bg-slate-100`} disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
                    Anterior
                </button>
                {nums.map((n, i) => (
                    <span key={n} className="flex items-center">
                        {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                        <button
                            className={`${boton} ${n === pagina ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            aria-current={n === pagina ? 'page' : undefined}
                            onClick={() => onPagina(n)}
                        >
                            {n}
                        </button>
                    </span>
                ))}
                <button className={`${boton} text-slate-600 hover:bg-slate-100`} disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>
                    Siguiente
                </button>
            </div>
        </nav>
    )
}

// Paginación en pantalla de una lista ya filtrada. Vuelve a la página 1 cuando cambia la
// lista (p. ej. al escribir en el buscador) y nunca se queda en una página que ya no existe.
export function usePaginacionLocal<T>(lista: T[], limite = POR_PAGINA) {
    const [pagina, setPagina] = useState(1)
    const total = lista.length
    const paginas = Math.max(1, Math.ceil(total / limite))
    const firma = `${total}`
    useEffect(() => setPagina(1), [firma])
    const actual = Math.min(pagina, paginas)
    const visibles = useMemo(() => lista.slice((actual - 1) * limite, actual * limite), [lista, actual, limite])
    return { visibles, control: { pagina: actual, paginas, total, limite, onPagina: setPagina } }
}

// Valor "retrasado": espera a que el usuario deje de teclear antes de consultar al servidor
export function useRetrasado<T>(valor: T, ms = 350): T {
    const [v, setV] = useState(valor)
    useEffect(() => {
        const t = setTimeout(() => setV(valor), ms)
        return () => clearTimeout(t)
    }, [valor, ms])
    return v
}
