/** Lee una imagen PNG/JPG, la reduce (máx. 600 px) y la devuelve como data URL. */
export async function readLogoFile(file: File): Promise<string> {
  if (!/^image\/(png|jpeg)$/.test(file.type)) {
    throw new Error("El logo debe ser una imagen PNG o JPG.");
  }
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("La imagen no es válida."));
    el.src = src;
  });
  const max = 600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  if (file.type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = file.type === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.9) : canvas.toDataURL("image/png");
  if (out.length > 650_000) throw new Error("El logo sigue siendo demasiado grande. Usa una imagen más sencilla.");
  return out;
}
