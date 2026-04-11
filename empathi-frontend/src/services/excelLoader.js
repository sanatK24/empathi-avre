import * as XLSX from 'xlsx'

const sheetCache = new Map()

export async function readExcelSheet(path, sheetName) {
  const cacheKey = `${path}::${sheetName ?? 'first'}`
  if (sheetCache.has(cacheKey)) {
    return sheetCache.get(cacheKey)
  }

  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }

  const data = await response.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const activeSheetName = sheetName || workbook.SheetNames[0]
  const sheet = workbook.Sheets[activeSheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  sheetCache.set(cacheKey, rows)
  return rows
}
