export const C2L: Record<string, string> = {
  'А': 'A', 'Ә': 'Ä', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Ғ': 'Ğ', 'Д': 'D', 'Е': 'E',
  'Ё': 'Yo', 'Ж': 'J', 'З': 'Z', 'И': 'İ', 'Й': 'İ', 'К': 'K', 'Қ': 'Q', 'Л': 'L',
  'М': 'M', 'Н': 'N', 'Ң': 'Ñ', 'О': 'O', 'Ө': 'Ö', 'П': 'P', 'Р': 'R', 'С': 'S',
  'Т': 'T', 'У': 'U', 'Ұ': 'Ū', 'Ү': 'Ü', 'Ф': 'F', 'Х': 'H', 'Һ': 'H', 'Ц': 'Ts',
  'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'І': 'I', 'Ь': '', 'Э': 'E',
  'Ю': 'Yu', 'Я': 'Ya',
}

const L2C_PAIRS: [string, string][] = [
  ['Shch', 'Щ'], ['Sh', 'Ш'], ['Ch', 'Ч'], ['Yo', 'Ё'], ['Yu', 'Ю'], ['Ya', 'Я'], ['Ts', 'Ц'],
  ['Ä', 'Ә'], ['Ğ', 'Ғ'], ['Q', 'Қ'], ['Ñ', 'Ң'], ['Ö', 'Ө'], ['Ū', 'Ұ'], ['Ü', 'Ү'],
  ['İ', 'И'], ['J', 'Ж'], ['A', 'А'], ['B', 'Б'], ['V', 'В'], ['G', 'Г'], ['D', 'Д'],
  ['E', 'Е'], ['Z', 'З'], ['K', 'К'], ['L', 'Л'], ['M', 'М'], ['N', 'Н'], ['O', 'О'],
  ['P', 'П'], ['R', 'Р'], ['S', 'С'], ['T', 'Т'], ['U', 'У'], ['F', 'Ф'], ['H', 'Х'],
  ['Y', 'Ы'], ['I', 'І'],
]

export function cyrillicToLatin(text: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const u = c.toUpperCase()
    if (C2L[u] !== undefined) {
      const m = C2L[u]
      result += c === u ? m : m.toLowerCase()
    } else {
      result += c
    }
  }
  return result
}

export function latinToCyrillic(text: string): string {
  let result = ''
  let i = 0
  while (i < text.length) {
    let matched = false
    for (const [l, c] of L2C_PAIRS) {
      const s = text.substring(i, i + l.length)
      if (s === l || s === l.toLowerCase()) {
        result += s === l ? c : c.toLowerCase()
        i += l.length
        matched = true
        break
      }
    }
    if (!matched) {
      result += text[i]
      i++
    }
  }
  return result
}
