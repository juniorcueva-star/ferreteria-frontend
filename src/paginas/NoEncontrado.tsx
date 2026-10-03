import { Link } from 'react-router'
import { EstadoVacio } from '@/componentes/ui/Estados'
import { Tarjeta } from '@/componentes/ui/Tarjeta'

export default function NoEncontrado() {
  return (
    <Tarjeta className="p-6">
      <EstadoVacio
        titulo="Página no encontrada"
        descripcion="La dirección que abriste no existe."
        accion={
          <Link to="/" className="text-sm font-semibold text-marca hover:underline">
            Volver al inicio
          </Link>
        }
      />
    </Tarjeta>
  )
}
