// Iconos SVG en línea — sin dependencias externas, trazo consistente.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
})

export const IconDashboard = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
    </svg>
)

export const IconMaterial = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
)

export const IconProveedor = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 9h18M3 9l2-5h14l2 5M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
        <path d="M9 13h6" />
    </svg>
)

export const IconLogout = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
)

export const IconPlus = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 5v14M5 12h14" />
    </svg>
)

export const IconEdit = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
)

export const IconTrash = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
)

export const IconClose = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
)

export const IconSearch = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
    </svg>
)

export const IconEye = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

export const IconComponente = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 12l10 5 10-5" />
    </svg>
)

export const IconEquipo = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M14 7h5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5v4z" />
        <path d="M10 7h4M7 12h.01M7 16h.01M11 12h6M11 16h6" />
    </svg>
)

export const IconBack = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
)

export const IconMenu = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
)

export const IconInventario = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 7h18v4H3zM4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
        <path d="M9 15h6" />
    </svg>
)

export const IconCotizacion = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M8 6h8M8 10h8M8 14h5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
        <path d="m18.3 18.3 1.7 1.7" />
    </svg>
)

export const IconHistorial = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 3v5h5" />
        <path d="M3.05 13a9 9 0 1 0 2.13-5.66L3 8" />
        <path d="M12 7v5l4 2" />
    </svg>
)

export const IconOrden = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
        <path d="M14 2v6h6M9 13h6M9 17h6M9 9h2" />
    </svg>
)

export const IconMoneda = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5a2 2 0 0 1 2-1.5h1a1.8 1.8 0 0 1 0 3.6h-1a1.8 1.8 0 0 0 0 3.6h1a2 2 0 0 0 2-1.5" />
    </svg>
)

export const IconConfig = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
)

export const IconKardex = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 12h4l2 5 4-12 2 7h6" />
    </svg>
)

export const IconUpload = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
)

export const IconCheck = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

export const IconChevronDown = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="m6 9 6 6 6-6" />
    </svg>
)

export const IconAlerta = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
    </svg>
)

export const IconMail = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 6 10 7 10-7" />
    </svg>
)

export const IconDownload = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
)

export const IconUsuarios = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)

export const IconPerfil = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
)

export const IconLock = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
)
