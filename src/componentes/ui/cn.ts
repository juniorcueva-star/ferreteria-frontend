/** Une clases de Tailwind ignorando las vacias: cn('a', cond && 'b'). */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}
