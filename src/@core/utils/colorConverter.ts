/**
 * Convert Hex color to rgb
 * @param hex
 */

export const hexToRgb = (hex: string) => {
// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i

  hex = hex.replace(shorthandRegex, (m: string, r: string, g: string, b: string) => {
    return r + r + g + g + b + b
  })

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  return result ? `${Number.parseInt(result[1], 16)},${Number.parseInt(result[2], 16)},${Number.parseInt(result[3], 16)}` : null
}

/**
 * Oscurece un color hex un porcentaje (0-1). Usado para derivar la variante
 * "darken-1" del color primario de una empresa, igual que el Theme Customizer
 * hace con sus colores predefinidos.
 */
export const darkenHex = (hex: string, amount = 0.12): string => {
  const rgb = hexToRgb(hex)
  if (!rgb)
    return hex

  const [r, g, b] = rgb.split(',').map(n => Math.max(0, Math.round(Number(n) * (1 - amount))))

  return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Devuelve '#000000' o '#ffffff', el que dé mejor contraste sobre el color dado
 * (luminancia relativa WCAG). Evita que un color de marca claro deje texto/iconos
 * "on-primary" ilegibles.
 */
export const getReadableOnColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  if (!rgb)
    return '#ffffff'

  const [r, g, b] = rgb.split(',').map(Number)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.6 ? '#000000' : '#ffffff'
}

/**
 *RGBA color to Hex color with / without opacity
 */
export const rgbaToHex = (rgba: string, forceRemoveAlpha = false) => {
  return (
    `#${
      rgba
        .replace(/^rgba?\(|\s+|\)$/g, '') // Get's rgba / rgb string values
        .split(',') // splits them at ","
        .filter((string, index) => !forceRemoveAlpha || index !== 3)
        .map(string => Number.parseFloat(string)) // Converts them to numbers
        .map((number, index) => (index === 3 ? Math.round(number * 255) : number)) // Converts alpha to 255 number
        .map(number => number.toString(16)) // Converts numbers to hex
        .map(string => (string.length === 1 ? `0${string}` : string)) // Adds 0 when length of one number is 1
        .join('')}`
  )
}
