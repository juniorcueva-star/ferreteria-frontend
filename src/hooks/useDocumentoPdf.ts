import { useMutation } from '@tanstack/react-query'
import { useAvisos } from '@/componentes/ui/notificaciones'

/** Descarga un PDF con un nombre de archivo propio (el PDF se pide con el token de sesion, por eso llega como Blob). */
export function guardarArchivo(pdf: Blob, nombre: string) {
  const url = URL.createObjectURL(pdf)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Descargar e imprimir un documento PDF (cotizacion o nota de venta).
 * Imprimir abre la pestana en el mismo clic (si no, el navegador la bloquea) y luego le pasa el PDF; si el navegador
 * la bloquea igual, se descarga el archivo.
 */
export function useDocumentoPdf(obtener: () => Promise<Blob>, nombreArchivo: string) {
  const { avisar } = useAvisos()
  const descargar = useMutation({
    mutationFn: obtener,
    onSuccess: (pdf) => guardarArchivo(pdf, nombreArchivo),
  })
  const imprimir = useMutation({
    mutationFn: async (ventana: Window | null) => ({ ventana, pdf: await obtener() }),
    onSuccess: ({ ventana, pdf }) => {
      if (ventana) {
        ventana.location.href = URL.createObjectURL(pdf)
      } else {
        guardarArchivo(pdf, nombreArchivo)
        avisar('El navegador bloqueó la ventana: se descargó el PDF para imprimirlo', 'info')
      }
    },
    onError: (_e, ventana) => ventana?.close(),
  })
  return {
    descargar: () => descargar.mutate(),
    imprimir: () => imprimir.mutate(window.open('', '_blank')),
    descargando: descargar.isPending,
    imprimiendo: imprimir.isPending,
    error: descargar.error ?? imprimir.error,
  }
}
