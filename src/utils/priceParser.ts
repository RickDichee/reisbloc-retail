export function parseProductDescription(descriptionText: string | null) {
  if (!descriptionText) return { description: '', packPrice: undefined, bulkPrice: undefined, packQty: 6, bulkQty: 12, wholesalePrice: undefined }
  try {
    if (descriptionText.startsWith('{') && descriptionText.endsWith('}')) {
      const parsed = JSON.parse(descriptionText)
      return {
        description: parsed.description || '',
        packPrice: parsed.packPrice,
        bulkPrice: parsed.bulkPrice,
        wholesalePrice: parsed.wholesalePrice,
        packQty: parsed.packQty || 6,
        bulkQty: parsed.bulkQty || 12
      }
    }
  } catch (e) {
    // ignore
  }
  return { description: descriptionText, packPrice: undefined, bulkPrice: undefined, packQty: 6, bulkQty: 12, wholesalePrice: undefined }
}

export default parseProductDescription
