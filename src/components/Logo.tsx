import { useState } from 'react'
import { LOGO_URL, MARCA } from '../config/marca'

// Logo de la empresa. Si el archivo aún no existe en /public, cae de vuelta a la
// insignia con la inicial para no dejar una imagen rota en pantalla.
export function Logo({
    className = '',
    inicialClassName = '',
}: {
    className?: string
    inicialClassName?: string
}) {
    const [falla, setFalla] = useState(false)

    if (falla) {
        return <div className={inicialClassName}>{MARCA.charAt(0)}</div>
    }

    return <img src={LOGO_URL} alt={MARCA} onError={() => setFalla(true)} className={className} />
}
