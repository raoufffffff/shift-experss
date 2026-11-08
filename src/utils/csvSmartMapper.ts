/**
 * Smart CSV Mapper - Intelligent column detection and mapping
 * Handles multiple languages, typos, and formats
 */

interface ColumnMapping {
  firstName: string[];
  lastName: string[];
  email: string[];
  establishment: string[];
  hourlyRate: string[];
}

// Exhaustive list of possible column names in multiple languages
const COLUMN_MAPPINGS: ColumnMapping = {
  firstName: [
    // English
    'first_name', 'firstname', 'first name', 'given name', 'givenname', 'forename',
    // French
    'prenom', 'prénom', 'nom de baptême',
    // Spanish
    'nombre', 'primer nombre',
    // Italian
    'nome', 'nome di battesimo',
    // Chinese
    '名', '名字', '名称',
    // Common variations
    'fname', 'f_name', 'first',
  ],
  lastName: [
    // English
    'last_name', 'lastname', 'last name', 'surname', 'family name', 'familyname',
    // French
    'nom', 'nom de famille',
    // Spanish
    'apellido', 'apellidos',
    // Italian
    'cognome',
    // Chinese
    '姓', '姓氏',
    // Common variations
    'lname', 'l_name', 'last',
  ],
  email: [
    // English
    'email', 'e-mail', 'mail', 'email address', 'e-mail address',
    // French
    'courriel', 'adresse email', 'adresse e-mail', 'mel',
    // Spanish
    'correo', 'correo electrónico', 'correo electronico',
    // Italian
    'posta', 'posta elettronica', 'indirizzo email',
    // Chinese
    '电子邮件', '邮件', '邮箱',
    // Japanese
    'メール', 'Eメール',
  ],
  establishment: [
    // English
    'establishment', 'location', 'site', 'store', 'branch', 'office', 'workplace',
    // French
    'etablissement', 'établissement', 'lieu', 'succursale', 'bureau',
    // Spanish
    'establecimiento', 'tienda', 'sucursal', 'local',
    // Italian
    'stabilimento', 'negozio', 'sede', 'punto vendita',
    // Chinese
    '门店', '店铺', '分店', '地点',
    // Common variations
    'shop', 'point of sale', 'pos',
  ],
  hourlyRate: [
    // English
    'hourly_rate', 'hourlyrate', 'hourly rate', 'rate', 'pay rate', 'wage', 'salary', 'hourly_wage', 'hourly wage',
    // French
    'taux horaire', 'taux_horaire', 'tauxhoraire', 'salaire', 'salaire horaire', 'remuneration',
    // Spanish
    'tarifa', 'tarifa horaria', 'salario', 'sueldo', 'pago por hora',
    // Italian
    'tariffa', 'tariffa oraria', 'salario', 'paga oraria', 'retribuzione',
    // Chinese
    '时薪', '小时工资', '工资', '薪资',
    // Common variations
    'rate/hr', 'rate/hour', '$/hr', '$/hour', 'hr_rate',
  ],
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching (typo detection)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize a string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\s-]/g, '') // Remove separators
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c');
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function similarity(a: string, b: string): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  // Exact match after normalization
  if (normalizedA === normalizedB) return 1.0;

  // Contains match
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return 0.9;
  }

  // Levenshtein distance based similarity
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  const distance = levenshteinDistance(normalizedA, normalizedB);
  const score = 1 - (distance / maxLen);

  return score;
}

/**
 * Detect the delimiter used in CSV
 */
export function detectDelimiter(sample: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(delimiter => ({
    delimiter,
    count: sample.split('\n')[0].split(delimiter).length,
  }));

  // Return delimiter with most occurrences
  const best = counts.reduce((max, curr) => curr.count > max.count ? curr : max);
  return best.count > 1 ? best.delimiter : ',';
}

/**
 * Map CSV headers to expected fields
 */
export interface MappingResult {
  firstName: number | null;
  lastName: number | null;
  email: number | null;
  establishment: number | null;
  hourlyRate: number | null;
  confidence: number; // 0-1
  unmappedColumns: string[];
  suggestions: { [key: string]: string }; // original -> suggested field
}

export function mapColumns(headers: string[]): MappingResult {
  const result: MappingResult = {
    firstName: null,
    lastName: null,
    email: null,
    establishment: null,
    hourlyRate: null,
    confidence: 0,
    unmappedColumns: [],
    suggestions: {},
  };

  const normalizedHeaders = headers.map(h => h.trim());
  const matched = new Set<number>();

  // Try to map each expected field
  for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
    let bestIndex = -1;
    let bestScore = 0;

    normalizedHeaders.forEach((header, index) => {
      if (matched.has(index)) return; // Already mapped

      // Try exact matches first
      for (const possibleName of possibleNames) {
        const score = similarity(header, possibleName);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
    });

    // Accept mapping if score is high enough (>0.6 = 60% similar)
    if (bestScore > 0.6) {
      result[field as keyof Omit<MappingResult, 'confidence' | 'unmappedColumns' | 'suggestions'>] = bestIndex;
      matched.add(bestIndex);

      // Add suggestion if not exact match
      if (bestScore < 1.0) {
        result.suggestions[normalizedHeaders[bestIndex]] = field;
      }
    }
  }

  // Calculate confidence based on required fields mapped
  const requiredFields = ['firstName', 'lastName', 'email'];
  const mappedRequired = requiredFields.filter(
    field => result[field as keyof MappingResult] !== null
  ).length;

  result.confidence = mappedRequired / requiredFields.length;

  // Find unmapped columns
  normalizedHeaders.forEach((header, index) => {
    if (!matched.has(index)) {
      result.unmappedColumns.push(header);
    }
  });

  return result;
}

/**
 * Detect encoding by checking for common non-UTF8 characters
 */
export function detectEncoding(sample: string): string {
  // Check for Windows-1252 specific characters
  const windows1252Pattern = /[\x80-\x9F]/;

  if (windows1252Pattern.test(sample)) {
    return 'windows-1252';
  }

  return 'utf-8';
}

/**
 * Parse CSV with auto-detected delimiter
 */
export function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current.trim());

  return values;
}
