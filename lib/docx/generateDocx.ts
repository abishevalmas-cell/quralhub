import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

export interface DocxOptions {
  title: string
  content: string // pre-formatted text with newlines
  fileName: string
}

export async function generateDocx({ title, content, fileName }: DocxOptions) {
  const lines = content.split('\n')
  const children: Paragraph[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect headings (all caps lines)
    const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[А-ЯӘҒҚҢӨҰҮІа-яA-Z]/.test(trimmed)

    // Detect numbered sections (1. 2. 3.)
    const isSection = /^\d+\./.test(trimmed)

    // Detect sub-items (1.1, 1.2)
    const isSubItem = /^\d+\.\d+/.test(trimmed)

    // Detect signature lines (contains ___)
    const isSignature = trimmed.includes('___')

    if (isHeading && !isSubItem) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 28, font: 'Times New Roman' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      }))
    } else if (isSection && !isSubItem) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 24, font: 'Times New Roman' })],
        spacing: { before: 300, after: 100 },
      }))
    } else if (isSignature) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 24, font: 'Times New Roman' })],
        spacing: { before: 200, after: 100 },
      }))
    } else if (trimmed === '') {
      children.push(new Paragraph({ children: [], spacing: { before: 100 } }))
    } else {
      // Check if line is right-aligned (starts with lots of spaces in original)
      const isRightAligned = line.startsWith('                        ')
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 24, font: 'Times New Roman' })],
        alignment: isRightAligned ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
        spacing: { after: 60 },
        indent: isSubItem ? { left: 720 } : undefined,
      }))
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 }, // standard margins
          size: { width: 11906, height: 16838 }, // A4
        }
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${fileName}.docx`)
}

export async function generateResumeDocx(data: {
  name: string
  phone: string
  email: string
  city: string
  birthYear: string
  goal: string
  education: { school: string; major: string; years: string; degree: string }[]
  experience: { company: string; position: string; years: string; duties: string }[]
  skills: string
  extra: string
}) {
  const children: Paragraph[] = []

  // Header with name
  children.push(new Paragraph({
    children: [new TextRun({ text: data.name || 'Аты-жөні', bold: true, size: 36, font: 'Times New Roman' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }))

  // Goal
  if (data.goal) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.goal, italics: true, size: 24, font: 'Times New Roman', color: '666666' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }))
  }

  // Contact info
  const contacts = [data.phone, data.email, data.city, data.birthYear].filter(Boolean).join(' | ')
  children.push(new Paragraph({
    children: [new TextRun({ text: contacts, size: 20, font: 'Times New Roman', color: '888888' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }))

  // Education section
  if (data.education.some(e => e.school)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '\u0411\u0406\u041B\u0406\u041C\u0406 / \u041E\u0411\u0420\u0410\u0417\u041E\u0412\u0410\u041D\u0418\u0415', bold: true, size: 24, font: 'Times New Roman' })],
      spacing: { before: 300, after: 100 },
      border: { bottom: { color: '000000', space: 1, size: 6, style: BorderStyle.SINGLE } },
    }))
    for (const edu of data.education) {
      if (!edu.school) continue
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.school, bold: true, size: 24, font: 'Times New Roman' }),
          edu.major ? new TextRun({ text: ` \u2014 ${edu.major}`, size: 24, font: 'Times New Roman' }) : new TextRun(''),
          edu.years ? new TextRun({ text: ` (${edu.years})`, size: 20, font: 'Times New Roman', color: '888888' }) : new TextRun(''),
        ],
        spacing: { after: 60 },
      }))
    }
  }

  // Experience section
  if (data.experience.some(e => e.company)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '\u0422\u04D8\u0416\u0406\u0420\u0418\u0411\u0415 / \u041E\u041F\u042B\u0422', bold: true, size: 24, font: 'Times New Roman' })],
      spacing: { before: 300, after: 100 },
      border: { bottom: { color: '000000', space: 1, size: 6, style: BorderStyle.SINGLE } },
    }))
    for (const exp of data.experience) {
      if (!exp.company) continue
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.position || exp.company, bold: true, size: 24, font: 'Times New Roman' }),
          exp.company && exp.position ? new TextRun({ text: ` \u2014 ${exp.company}`, size: 24, font: 'Times New Roman' }) : new TextRun(''),
          exp.years ? new TextRun({ text: ` (${exp.years})`, size: 20, font: 'Times New Roman', color: '888888' }) : new TextRun(''),
        ],
        spacing: { after: 40 },
      }))
      if (exp.duties) {
        children.push(new Paragraph({
          children: [new TextRun({ text: exp.duties, size: 22, font: 'Times New Roman', color: '444444' })],
          spacing: { after: 80 },
          indent: { left: 360 },
        }))
      }
    }
  }

  // Skills
  if (data.skills) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '\u0414\u0410\u0492\u0414\u042B\u041B\u0410\u0420 / \u041D\u0410\u0412\u042B\u041A\u0418', bold: true, size: 24, font: 'Times New Roman' })],
      spacing: { before: 300, after: 100 },
      border: { bottom: { color: '000000', space: 1, size: 6, style: BorderStyle.SINGLE } },
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: data.skills, size: 24, font: 'Times New Roman' })],
      spacing: { after: 80 },
    }))
  }

  // Extra
  if (data.extra) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '\u049A\u041E\u0421\u042B\u041C\u0428\u0410 / \u0414\u041E\u041F\u041E\u041B\u041D\u0418\u0422\u0415\u041B\u042C\u041D\u041E', bold: true, size: 24, font: 'Times New Roman' })],
      spacing: { before: 300, after: 100 },
      border: { bottom: { color: '000000', space: 1, size: 6, style: BorderStyle.SINGLE } },
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: data.extra, size: 24, font: 'Times New Roman' })],
    }))
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
          size: { width: 11906, height: 16838 },
        }
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${data.name || 'resume'}-quralhub.docx`)
}
