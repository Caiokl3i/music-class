import { existsSync } from 'node:fs'

export const PDF_COLORS = {
  accent: '#0f766e',
  accentSoft: '#f0fdfa',
  ink: '#1a2433',
  muted: '#5b6b7c',
  border: '#e2e8f0',
  surface: '#f4f6f8',
  white: '#ffffff',
  danger: '#b45309',
} as const

export type PdfFonts = {
  regular: string | null
  bold: string | null
}

const FONT_REGULAR_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
]

const FONT_BOLD_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
]

export function resolvePdfFonts(): PdfFonts {
  return {
    regular: FONT_REGULAR_CANDIDATES.find((path) => existsSync(path)) ?? null,
    bold: FONT_BOLD_CANDIDATES.find((path) => existsSync(path)) ?? null,
  }
}

export function useFont(doc: PDFKit.PDFDocument, fonts: PdfFonts, weight: 'regular' | 'bold') {
  const path = weight === 'bold' ? (fonts.bold ?? fonts.regular) : fonts.regular
  if (path) doc.font(path)
  else doc.font(weight === 'bold' ? 'Helvetica-Bold' : 'Helvetica')
}

export function drawRoundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string
) {
  doc.save()
  doc.roundedRect(x, y, width, height, radius).fill(fill)
  doc.restore()
}
