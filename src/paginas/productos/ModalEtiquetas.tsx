import { zodResolver } from '@hookform/resolvers/zod'
import { Printer } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { productosApi } from '@/api/catalogo'
import { Boton } from '@/componentes/ui/Boton'
import { CampoTexto, Casilla } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useDocumentoPdf } from '@/hooks/useDocumentoPdf'

const ETIQUETAS_POR_HOJA = 24

const esquema = z.object({
  copias: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Escriba un número entero')
    .refine((v) => Number(v) >= 1 && Number(v) <= 50, 'De 1 a 50 copias'),
  todas: z.boolean(),
})
type Datos = z.infer<typeof esquema>

/**
 * Imprimir etiquetas con codigo de barras de los productos elegidos (hoja A4 de 3 x 8 para pegar en los estantes).
 * La caja lee el codigo con el lector o la camara y agrega el producto.
 */
export function ModalEtiquetas({ productoIds, onCerrar }: { productoIds: number[]; onCerrar: () => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { copias: '1', todas: false } })
  const valores = useWatch({ control })
  const copias = Number(valores.copias) || 0
  const pdf = useDocumentoPdf(() => productosApi.etiquetas(productoIds, copias, valores.todas ?? false), 'etiquetas.pdf')
  const total = productoIds.length * copias

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Imprimir etiquetas"
      descripcion={`${productoIds.length} producto(s). Cada etiqueta lleva el nombre, el precio (el de oferta si hay) y el código de barras que lee la caja.`}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton icono={<Printer className="size-4" />} cargando={pdf.imprimiendo} onClick={() => void handleSubmit(() => pdf.imprimir())()}>
            Imprimir etiquetas
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <CampoTexto etiqueta="Copias de cada etiqueta" inputMode="numeric" error={errors.copias?.message} {...register('copias')} />
        <Casilla etiqueta="Una etiqueta por cada presentación (no solo la principal)" {...register('todas')} />
        {total > 0 && !valores.todas && (
          <p className="text-sm text-tinta-suave" data-testid="resumen-etiquetas">
            {total} etiqueta(s) · {Math.ceil(total / ETIQUETAS_POR_HOJA)} hoja(s) A4
          </p>
        )}
        {pdf.error && <MensajeError error={pdf.error} />}
      </div>
    </Modal>
  )
}
