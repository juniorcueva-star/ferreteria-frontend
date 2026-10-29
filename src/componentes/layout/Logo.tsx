/** Identidad del negocio y nombre del sistema. */
export function Logo({ claro = true }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo-bonifaz.png" alt="Bonifaz y Cía." className="size-24 shrink-0 rounded-xl bg-black object-contain" />
      <div className="leading-tight">
        <p className={claro ? 'text-base font-bold text-white' : 'text-base font-bold text-tinta'}>TodoPernos</p>
        <p className="text-xs text-tinta-tenue">Sistema ERP</p>
      </div>
    </div>
  )
}
