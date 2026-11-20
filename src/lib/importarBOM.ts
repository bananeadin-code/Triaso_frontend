// Lector TOLERANTE de una "Relación de Materiales" (BOM de un equipo) en Excel, con el formato
// que usa Triaso. No exige posiciones fijas: busca los encabezados por nombre.
//  - Datos del equipo: filas "Clave (sin órden)", "Nombre", "Observaciones" (arriba de la tabla)
//  - Sumas del Excel: fila de etiquetas "A: Pailería … Total" con sus importes en la fila de arriba
//  - Tabla: encabezados Clave · Concepto · Proveedor · Tipo · Cantidad · Unidad · Precio unitario
//    (sub-encabezados pesos / dólares en la fila siguiente)
//  - Una fila con concepto pero SIN clave y sin cantidad = inicio de una SECCIÓN (componente);
//    si la sección no tiene materiales es un encabezado de grupo (lo resuelve el servidor).
// La función pura `parsearFilasBOM` recibe las filas ya leídas: así se prueba también desde Node.
import * as XLSX from 'xlsx'

export interface FilaBOM {
    clave: string
    concepto: string
    proveedor: string
    tipo: string
    cantidad: number
    unidad: string
    pesos: number
    dolares: number
    paridad?: number // tipo de cambio con que el Excel convierte los precios en dólares
}
export interface ArchivoBOM {
    archivo: string
    equipo: { clave: string; nombre: string; observaciones: string }
    secciones: { nombre: string; filas: FilaBOM[] }[]
    sumas?: Record<string, number>
}

const norm = (s: unknown) =>
    String(s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9: ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
const numero = (v: unknown) => {
    if (typeof v === 'number') return v
    const n = Number(String(v ?? '').replace(/[$,\s]/g, ''))
    return isNaN(n) ? 0 : n
}
const texto = (v: unknown) => String(v ?? '').trim()

export function parsearFilasBOM(filas: unknown[][], archivo: string): ArchivoBOM {
    // ---- Encabezados de la tabla ----
    const iHead = filas.findIndex((f) => {
        const n = (f ?? []).map(norm)
        return n.includes('clave') && n.includes('concepto')
    })
    if (iHead < 0) throw new Error('No se encontró la fila de encabezados (Clave, Concepto…) en el archivo')
    const head = filas[iHead].map(norm)
    const col = (...nombres: string[]) => head.findIndex((h) => nombres.some((n) => h === n || h.startsWith(n)))
    const c = {
        clave: col('clave'),
        concepto: col('concepto'),
        proveedor: col('proveedor'),
        tipo: col('tipo', 'categoria'),
        cantidad: col('cantidad', 'cant'),
        unidad: col('unidad'),
        precio: col('precio unitario', 'precio', 'costo unitario', 'costo'),
        pesos: -1,
        dolares: -1,
        paridad: -1,
    }
    // Sub-encabezados pesos / dólares (fila siguiente)
    const sub = (filas[iHead + 1] ?? []).map(norm)
    c.pesos = sub.findIndex((s) => s === 'pesos' || s === 'mxn')
    c.dolares = sub.findIndex((s) => s === 'dolares' || s === 'usd')
    c.paridad = sub.findIndex((s) => s === 'paridad' || s === 'tipo de cambio' || s === 'tc')
    const inicio = c.pesos >= 0 || c.dolares >= 0 ? iHead + 2 : iHead + 1
    if (c.pesos < 0) c.pesos = c.precio
    if (c.clave < 0 || c.concepto < 0) throw new Error('El archivo no tiene columnas de Clave y Concepto')

    // ---- Datos del equipo (arriba de la tabla) ----
    const equipo = { clave: '', nombre: '', observaciones: '' }
    const valorJunto = (f: unknown[], desde: number) => texto(f.slice(desde + 1).find((x) => texto(x)))
    for (const f of filas.slice(0, iHead)) {
        ;(f ?? []).forEach((celda, j) => {
            const n = norm(celda)
            if (!equipo.clave && n.startsWith('clave')) equipo.clave = valorJunto(f, j)
            else if (!equipo.nombre && n === 'nombre') equipo.nombre = valorJunto(f, j)
            else if (!equipo.observaciones && n.startsWith('observaciones')) equipo.observaciones = valorJunto(f, j)
        })
    }

    // ---- Sumas por categoría ("A: Pailería" … "Total"), importes en la fila de arriba ----
    let sumas: Record<string, number> | undefined
    const iEtiq = filas.slice(0, iHead).findIndex((f) => (f ?? []).some((x) => /^[a-z]\s*:/.test(norm(x))))
    if (iEtiq > 0) {
        sumas = {}
        filas[iEtiq].forEach((x, j) => {
            const n = norm(x)
            const m = n.match(/^([a-z])\s*:/)
            const valor = numero(filas[iEtiq - 1]?.[j])
            if (m) sumas![m[1].toUpperCase()] = valor
            else if (n === 'total') sumas!.total = valor
        })
    }

    // ---- Secciones y materiales ----
    const secciones: ArchivoBOM['secciones'] = []
    let actual: ArchivoBOM['secciones'][number] | null = null
    for (const f of filas.slice(inicio)) {
        if (!f) continue
        const clave = texto(f[c.clave])
        const concepto = texto(f[c.concepto])
        const cantidad = c.cantidad >= 0 ? numero(f[c.cantidad]) : 0
        if (!clave && !concepto) continue
        if (!clave && cantidad === 0) {
            // Encabezado de sección (componente) o de grupo
            actual = { nombre: concepto, filas: [] }
            secciones.push(actual)
            continue
        }
        if (!actual) {
            actual = { nombre: 'General', filas: [] }
            secciones.push(actual)
        }
        actual.filas.push({
            clave,
            concepto,
            proveedor: c.proveedor >= 0 ? texto(f[c.proveedor]) : '',
            tipo: c.tipo >= 0 ? texto(f[c.tipo]) : '',
            cantidad,
            unidad: c.unidad >= 0 ? texto(f[c.unidad]) : '',
            pesos: c.pesos >= 0 ? numero(f[c.pesos]) : 0,
            dolares: c.dolares >= 0 ? numero(f[c.dolares]) : 0,
            paridad: c.paridad >= 0 ? numero(f[c.paridad]) : 0,
        })
    }
    if (!secciones.some((s) => s.filas.length)) throw new Error('No se encontraron materiales en el archivo')
    return { archivo, equipo, secciones, sumas }
}

// Lee el archivo en el navegador (.xls / .xlsx). Usa la primera hoja.
export async function leerBOMDeExcel(file: File): Promise<ArchivoBOM> {
    const wb = XLSX.read(await file.arrayBuffer())
    const hoja = wb.Sheets[wb.SheetNames[0]]
    const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false, defval: '' })
    return parsearFilasBOM(filas, file.name)
}
