import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { EstadoVacio } from './Estados'
import { Tarjeta } from './Tarjeta'

export function SinPermiso() {
  return (
    <Tarjeta className="p-6">
      <EstadoVacio
        icono={<ShieldAlert className="size-6" />}
        titulo="No tienes permiso para ver esta sección"
        descripcion="Tu rol no tiene acceso a este módulo. Si lo necesitas, pídeselo al administrador."
        accion={
          <Link to="/" className="text-sm font-semibold text-marca hover:underline">
            Volver al inicio
          </Link>
        }
      />
    </Tarjeta>
  )
}
