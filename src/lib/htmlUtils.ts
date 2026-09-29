/**
 * HTML Entity Decoder and Text Cleaning Utilities
 * Handles decoding HTML entities and normalizing whitespace
 */

/**
 * Decode common HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entityMap: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&deg;': '°',
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }
  return decoded
}

/**
 * Clean and normalize text:
 * - Decode HTML entities
 * - Normalize whitespace (multiple spaces to single)
 * - Trim leading/trailing whitespace
 */
export function cleanText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single
    .trim()
}

/**
 * Extract organization name from tender title
 * Tries to identify common organization prefixes
 */
export function extractOrganizationFromTitle(title: string, sourceName: string): string {
  const cleanedTitle = cleanText(title)

  // Map source name to organization
  const sourceMap: { [key: string]: string } = {
    'SANRAL': 'South African National Roads Agency Limited',
    'Eskom': 'Eskom Holdings SOC Limited',
    'Cape Town': 'City of Cape Town',
    'City of Johannesburg': 'City of Johannesburg',
    'Ekurhuleni': 'Ekurhuleni Metropolitan Municipality',
    'Department of Health': 'Department of Health',
    'DBSA': 'Development Bank of Southern Africa',
    'TCTA': 'Trans-Caledon Tunnel Authority',
  }

  if (sourceMap[sourceName]) {
    return sourceMap[sourceName]
  }

  // Try to extract from title patterns
  if (cleanedTitle.includes('SANRAL') || cleanedTitle.includes('NRA') || cleanedTitle.match(/^R\.\d+-\d+-/)) {
    return 'South African National Roads Agency Limited'
  }

  if (cleanedTitle.includes('Eskom')) {
    return 'Eskom Holdings SOC Limited'
  }

  if (cleanedTitle.includes('Cape Town') || cleanedTitle.includes('City of Cape Town')) {
    return 'City of Cape Town'
  }

  if (cleanedTitle.includes('Johannesburg') || cleanedTitle.includes('CoJ')) {
    return 'City of Johannesburg'
  }

  if (cleanedTitle.includes('Ekurhuleni')) {
    return 'Ekurhuleni Metropolitan Municipality'
  }

  if (cleanedTitle.includes('Health') && sourceName === 'Department of Health') {
    return 'Department of Health'
  }

  if (cleanedTitle.includes('DBSA') || cleanedTitle.includes('Development Bank')) {
    return 'Development Bank of Southern Africa'
  }

  if (cleanedTitle.includes('TCTA') || cleanedTitle.includes('Trans-Caledon')) {
    return 'Trans-Caledon Tunnel Authority'
  }

  return 'Unknown'
}

/**
 * Clean and limit title length
 */
export function cleanTitle(title: string, maxLength: number = 200): string {
  return cleanText(title).substring(0, maxLength)
}
