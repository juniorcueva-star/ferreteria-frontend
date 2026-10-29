import type { PresentacionResponse, ProductoResponse } from '@/api/tipos'

/** La etiqueta identifica una presentacion vendible, no solo el producto padre. */
export function presentacionEscaneada(producto: ProductoResponse, codigo: string): PresentacionResponse | undefined {
  const codigoNormalizado = codigo.trim()
  if (!producto.activo || codigoNormalizado === '') {
    return undefined
  }
  return producto.presentaciones.find((presentacion) => presentacion.activo && presentacion.codigoBarras === codigoNormalizado)
}

/**
 * Un lector HID escribe como un teclado y puede terminar otra lectura antes de que
 * la API responda. La cola conserva cada Enter y evita peticiones simultaneas.
 */
export function crearColaEscaneos(procesar: (codigo: string) => Promise<void>) {
  const pendientes: string[] = []
  let procesando = false

  const siguiente = async (): Promise<void> => {
    if (procesando) return
    const codigo = pendientes.shift()
    if (!codigo) return
    procesando = true
    try {
      await procesar(codigo)
    } catch {
      // El procesador comunica el error al operador; la siguiente lectura sigue su curso.
    } finally {
      procesando = false
      void siguiente()
    }
  }

  return {
    encolar(codigo: string) {
      const normalizado = codigo.trim()
      if (!normalizado) return
      pendientes.push(normalizado)
      void siguiente()
    },
  }
}
