/**
 * Comprime una imagen en el cliente antes de subirla al servidor.
 * @param file Archivo original
 * @param maxWidth Ancho máximo (default 400px para avatars)
 * @param maxHeight Alto máximo (default 400px)
 * @param quality Calidad de compresión (0.1 a 1.0)
 */
export async function compressImage(file: File, maxWidth = 400, maxHeight = 400, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular proporciones
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Error al procesar la imagen'));
          },
          'image/jpeg',
          quality
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
}
/**
 * Comprime una imagen buscando un tamaño objetivo (~100 KB) sin pérdida
 * visible de calidad: redimensiona a máximo 800 px por lado y baja la
 * calidad JPEG por escalones hasta quedar cerca del objetivo.
 * Nunca lanza: si algo falla, devuelve el archivo original.
 * (Las fotos PNG con transparencia pierden el canal alfa al pasar a JPEG,
 * igual que compressImage.)
 */
export async function compressImageToTarget(
  file: File | Blob,
  maxSide = 800,
  targetBytes = 100 * 1024,
  initialQuality = 0.85
): Promise<Blob> {
  try {
    const img = await loadImageElement(file)
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    // Si ya está en tamaño y en peso, no re-codificar (evita perder calidad).
    if (scale === 1 && file.size <= targetBytes * 1.2) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const encode = (quality: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      })

    // Escalera de calidad: busca quedar cerca de 100 KB sin bajar de 0.4
    // (por debajo de eso la pérdida sí se nota).
    let best = await encode(initialQuality)
    for (const q of [0.7, 0.55, 0.4]) {
      if (!best || best.size <= targetBytes * 1.2) break
      const next = await encode(q)
      if (next) best = next
    }
    return best ?? file
  } catch {
    return file
  }
}

function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'))
  })
}
