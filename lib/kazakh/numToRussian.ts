export function numToRussian(n: number): string {
  if (n === 0) return 'ноль'
  if (n < 0) return 'минус ' + numToRussian(-n)

  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
  const onesFem = ['', 'одна', 'две']
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
  const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']

  function plural(n: number, one: string, two: string, five: string): string {
    const abs = Math.abs(n) % 100
    if (abs >= 11 && abs <= 19) return five
    const last = abs % 10
    if (last === 1) return one
    if (last >= 2 && last <= 4) return two
    return five
  }

  function chunkToWords(chunk: number, feminine: boolean): string {
    const parts: string[] = []
    const h = Math.floor(chunk / 100)
    const remainder = chunk % 100
    const t = Math.floor(remainder / 10)
    const o = remainder % 10

    if (h > 0) parts.push(hundreds[h])

    if (remainder >= 10 && remainder <= 19) {
      parts.push(teens[remainder - 10])
    } else {
      if (t > 0) parts.push(tens[t])
      if (o > 0) {
        if (feminine && (o === 1 || o === 2)) {
          parts.push(onesFem[o])
        } else {
          parts.push(ones[o])
        }
      }
    }

    return parts.join(' ')
  }

  const scales: { divisor: number; feminine: boolean; forms: [string, string, string] }[] = [
    { divisor: 1_000_000_000_000, feminine: false, forms: ['триллион', 'триллиона', 'триллионов'] },
    { divisor: 1_000_000_000, feminine: false, forms: ['миллиард', 'миллиарда', 'миллиардов'] },
    { divisor: 1_000_000, feminine: false, forms: ['миллион', 'миллиона', 'миллионов'] },
    { divisor: 1_000, feminine: true, forms: ['тысяча', 'тысячи', 'тысяч'] },
  ]

  const resultParts: string[] = []
  let remaining = n

  for (const scale of scales) {
    const chunk = Math.floor(remaining / scale.divisor)
    remaining = remaining % scale.divisor
    if (chunk > 0) {
      const words = chunkToWords(chunk, scale.feminine)
      const form = plural(chunk, scale.forms[0], scale.forms[1], scale.forms[2])
      resultParts.push(words + ' ' + form)
    }
  }

  if (remaining > 0) {
    resultParts.push(chunkToWords(remaining, false))
  }

  return resultParts.join(' ')
}
