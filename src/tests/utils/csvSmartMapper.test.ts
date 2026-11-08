import { describe, it, expect } from 'vitest'
import {
  detectDelimiter,
  mapColumns,
  detectEncoding,
  parseCSVLine,
} from '@/utils/csvSmartMapper'

describe('detectDelimiter', () => {
  it('detects comma', () => {
    expect(detectDelimiter('name,email,phone\nAlice,a@b.com,123')).toBe(',')
  })

  it('detects semicolon', () => {
    expect(detectDelimiter('nom;email;telephone\nAlice;a@b.com;123')).toBe(';')
  })

  it('detects tab', () => {
    expect(detectDelimiter('name\temail\tphone\nAlice\ta@b.com\t123')).toBe('\t')
  })

  it('detects pipe', () => {
    expect(detectDelimiter('name|email|phone\nAlice|a@b.com|123')).toBe('|')
  })

  it('defaults to comma when ambiguous', () => {
    expect(detectDelimiter('singlecolumn')).toBe(',')
  })
})

describe('mapColumns', () => {
  it('maps standard English headers', () => {
    const result = mapColumns(['first_name', 'last_name', 'email', 'establishment', 'hourly_rate'])
    expect(result.firstName).toBe(0)
    expect(result.lastName).toBe(1)
    expect(result.email).toBe(2)
    expect(result.establishment).toBe(3)
    expect(result.hourlyRate).toBe(4)
    expect(result.confidence).toBe(1)
  })

  it('maps French headers', () => {
    const result = mapColumns(['prénom', 'nom', 'email', 'établissement', 'taux horaire'])
    expect(result.firstName).toBe(0)
    expect(result.lastName).toBe(1)
    expect(result.email).toBe(2)
    expect(result.establishment).toBe(3)
    expect(result.hourlyRate).toBe(4)
  })

  it('maps case-insensitive headers', () => {
    const result = mapColumns(['First Name', 'Last Name', 'Email'])
    expect(result.firstName).toBe(0)
    expect(result.lastName).toBe(1)
    expect(result.email).toBe(2)
  })

  it('calculates confidence based on required fields', () => {
    // All 3 required fields (firstName, lastName, email)
    const full = mapColumns(['first_name', 'last_name', 'email'])
    expect(full.confidence).toBe(1)

    // Only email
    const partial = mapColumns(['email', 'random_col', 'other_col'])
    expect(partial.confidence).toBeGreaterThan(0)
    expect(partial.confidence).toBeLessThan(1)
  })

  it('tracks unmapped columns', () => {
    const result = mapColumns(['first_name', 'last_name', 'email', 'random_column'])
    expect(result.unmappedColumns).toContain('random_column')
  })

  it('handles empty headers', () => {
    const result = mapColumns([])
    expect(result.firstName).toBeNull()
    expect(result.lastName).toBeNull()
    expect(result.email).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('handles Spanish headers', () => {
    const result = mapColumns(['nombre', 'apellido', 'correo'])
    expect(result.firstName).toBe(0)
    expect(result.lastName).toBe(1)
    expect(result.email).toBe(2)
  })
})

describe('detectEncoding', () => {
  it('returns utf-8 for normal text', () => {
    expect(detectEncoding('Hello World')).toBe('utf-8')
  })

  it('returns utf-8 for accented French text', () => {
    expect(detectEncoding('Prénom, Nom, Email')).toBe('utf-8')
  })

  it('detects windows-1252 for control chars', () => {
    // Characters in range 0x80-0x9F indicate Windows-1252
    const win1252Sample = 'Name\x80Address'
    expect(detectEncoding(win1252Sample)).toBe('windows-1252')
  })
})

describe('parseCSVLine', () => {
  it('parses simple comma-separated values', () => {
    expect(parseCSVLine('Alice,Bob,Charlie', ',')).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('handles quoted fields', () => {
    expect(parseCSVLine('"Alice","Bob","Charlie"', ',')).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('handles delimiter inside quotes', () => {
    expect(parseCSVLine('"Alice,Jr",Bob,Charlie', ',')).toEqual(['Alice,Jr', 'Bob', 'Charlie'])
  })

  it('handles escaped quotes (doubled)', () => {
    expect(parseCSVLine('"Alice ""The Great""",Bob', ',')).toEqual(['Alice "The Great"', 'Bob'])
  })

  it('handles semicolon delimiter', () => {
    expect(parseCSVLine('Alice;Bob;Charlie', ';')).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('trims whitespace', () => {
    expect(parseCSVLine(' Alice , Bob , Charlie ', ',')).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('handles empty fields', () => {
    expect(parseCSVLine('Alice,,Charlie', ',')).toEqual(['Alice', '', 'Charlie'])
  })
})
