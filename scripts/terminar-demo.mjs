// Deja la demo como un único archivo: demo/gestor-documental-demo.html
import { readdirSync, renameSync, rmSync } from 'node:fs'

renameSync('demo/index.html', 'demo/gestor-documental-demo.html')
// El resto son respaldos de tipografía para navegadores antiguos que el HTML no necesita.
for (const archivo of readdirSync('demo')) {
  if (archivo !== 'gestor-documental-demo.html') rmSync(`demo/${archivo}`, { recursive: true })
}
