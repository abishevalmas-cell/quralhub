function getLastVowelType(word: string): 'hard' | 'soft' {
  const hard = 'аоұыуя'
  const soft = 'әөүіеиэёю'
  for (let i = word.length - 1; i >= 0; i--) {
    if (hard.includes(word[i].toLowerCase())) return 'hard'
    if (soft.includes(word[i].toLowerCase())) return 'soft'
  }
  return 'hard'
}

export interface DeclensionResult {
  atau: string
  ilik: string
  barys: string
  tabys: string
  jatys: string
  shygys: string
  komektes: string
}

export function declineNoun(word: string): DeclensionResult {
  const vt = getLastVowelType(word)
  const last = word[word.length - 1].toLowerCase()
  const voiced = 'бвгджзлмнңрй'
  const vowels = 'аәеёиоөұүыіуюяэ'
  const isVowelEnd = vowels.includes(last)
  const isVoicedEnd = voiced.includes(last)

  let ilik: string, barys: string, tabys: string, jatys: string, shygys: string, komektes: string
  if (isVowelEnd) {
    ilik = word + (vt === 'hard' ? 'ның' : 'нің')
    barys = word + (vt === 'hard' ? 'ға' : 'ге')
    tabys = word + (vt === 'hard' ? 'ны' : 'ні')
    jatys = word + (vt === 'hard' ? 'да' : 'де')
    shygys = word + (vt === 'hard' ? 'дан' : 'ден')
    komektes = word + 'мен'
  } else if (isVoicedEnd) {
    ilik = word + (vt === 'hard' ? 'дың' : 'дің')
    barys = word + (vt === 'hard' ? 'ға' : 'ге')
    tabys = word + (vt === 'hard' ? 'ды' : 'ді')
    jatys = word + (vt === 'hard' ? 'да' : 'де')
    shygys = word + (vt === 'hard' ? 'дан' : 'ден')
    komektes = word + 'мен'
  } else {
    ilik = word + (vt === 'hard' ? 'тың' : 'тің')
    barys = word + (vt === 'hard' ? 'қа' : 'ке')
    tabys = word + (vt === 'hard' ? 'ты' : 'ті')
    jatys = word + (vt === 'hard' ? 'та' : 'те')
    shygys = word + (vt === 'hard' ? 'тан' : 'тен')
    komektes = word + 'пен'
  }
  return { atau: word, ilik, barys, tabys, jatys, shygys, komektes }
}
