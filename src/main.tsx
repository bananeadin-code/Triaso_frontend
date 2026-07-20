import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import Router from './router'
import { ICON_URL } from './config/marca'

// Favicon de la pestaña. Usa ICON_URL (conviene que sea una imagen CUADRADA;
// el logo horizontal se vería como una rayita). Si el archivo no existe,
// se conserva el favicon por defecto.
const iconoPestana = document.querySelector<HTMLLinkElement>("link[rel='icon']")
if (iconoPestana) {
    const prueba = new Image()
    prueba.onload = () => (iconoPestana.href = ICON_URL)
    prueba.src = ICON_URL
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { refetchOnWindowFocus: false, retry: 1 },
    },
})

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <Router />
            <ToastContainer position="top-right" theme="colored" autoClose={3000} />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </StrictMode>
)
