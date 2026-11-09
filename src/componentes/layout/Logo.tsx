/** Logo del negocio (Bonifaz & Cia) con su nombre y lema. */
export function Logo({ claro = true }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="" className="size-11 shrink-0 rounded-xl shadow-sm" />
      <div className="leading-tight">
        <p className={claro ? 'text-[17px] font-bold text-white' : 'text-[17px] font-bold text-tinta'}>Bonifaz &amp; Cia</p>
        <p className="text-xs font-semibold tracking-wide text-marca uppercase">Pernos y afines</p>
      </div>
    </div>
  )
}
