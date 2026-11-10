/** Simula el ancho de la ventana para `matchMedia('(min-width: Npx)')`, que jsdom no implementa. */
export function simularAncho(px: number) {
  window.matchMedia = ((consulta: string) => {
    const minimo = Number(/min-width:\s*(\d+)px/.exec(consulta)?.[1] ?? 0)
    return {
      matches: px >= minimo,
      media: consulta,
      addEventListener() {},
      removeEventListener() {},
    }
  }) as unknown as typeof window.matchMedia
}
