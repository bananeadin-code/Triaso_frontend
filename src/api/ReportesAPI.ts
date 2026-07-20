import api from '../lib/axios'

// Descarga un reporte PDF (con el token vía interceptor) y dispara la descarga.
export async function descargarReporte(path: string, filename: string) {
    try {
        const res = await api.get(`/reportes/${path}`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(res.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
    } catch {
        throw new Error('No se pudo generar el reporte')
    }
}
