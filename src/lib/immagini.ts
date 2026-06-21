// Ridimensiona un'immagine lato client a un piccolo PNG "data URL", così da
// salvarla come testo (niente Storage) — porta ridimensionaImmagine/
// leggiImmagineLimitata della v1. Usato per i loghi delle squadre di calcio.
export function logoDaFile(file: File, maxLato = 128, maxKB = 2048): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error('Seleziona un file immagine.'))
      return
    }
    if (file.size > maxKB * 1024) {
      reject(new Error('Immagine troppo pesante (max ' + maxKB + ' KB). Comprimila e riprova.'))
      return
    }
    const lettore = new FileReader()
    lettore.onerror = () => reject(new Error('Impossibile leggere il file.'))
    lettore.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('File immagine non valido.'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxLato) {
          height = Math.round((height * maxLato) / width)
          width = maxLato
        } else if (height > maxLato) {
          width = Math.round((width * maxLato) / height)
          height = maxLato
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Impossibile elaborare l’immagine.'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = lettore.result as string
    }
    lettore.readAsDataURL(file)
  })
}
