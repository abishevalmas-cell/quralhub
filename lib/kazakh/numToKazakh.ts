export function numToKazakh(n: number): string {
  if (n === 0) return 'нөл'
  const ones = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз']
  const teens = ['он', 'он бір', 'он екі', 'он үш', 'он төрт', 'он бес', 'он алты', 'он жеті', 'он сегіз', 'он тоғыз']
  const tens = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан']
  const scales = ['', 'мың', 'миллион', 'миллиард', 'триллион']
  if (n < 0) return 'минус ' + numToKazakh(-n)
  const parts: string[] = []
  let scaleIdx = 0
  let remaining = n
  while (remaining > 0) {
    const chunk = remaining % 1000
    remaining = Math.floor(remaining / 1000)
    if (chunk > 0) {
      let s = ''
      const h = Math.floor(chunk / 100)
      const t = chunk % 100
      if (h > 0) s += (h === 1 ? '' : ones[h] + ' ') + 'жүз'
      if (t >= 10 && t <= 19) { s += (s ? ' ' : '') + teens[t - 10] }
      else { if (Math.floor(t / 10) > 0) s += (s ? ' ' : '') + tens[Math.floor(t / 10)]; if (t % 10 > 0) s += (s ? ' ' : '') + ones[t % 10] }
      if (scaleIdx > 0) s += ' ' + scales[scaleIdx]
      parts.unshift(s)
    }
    scaleIdx++
  }
  return parts.join(' ')
}
