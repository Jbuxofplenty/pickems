/**
 * Utilities.test.js - Unit tests for utility functions
 */

// Load mocks before importing code
require('./__mocks__/gas-mocks');

// Import the functions we're testing
// Note: In GAS environment, these are global. For testing, we need to eval the code.
const fs = require('fs');
const path = require('path');

// Load and execute the Utilities.js code
const utilitiesCode = fs.readFileSync(path.join(__dirname, 'Utilities.js'), 'utf8');
eval(utilitiesCode);

describe('Utilities', () => {
  
  describe('normalizeTeamName', () => {
    test('should normalize full team names', () => {
      expect(normalizeTeamName('Cardinals')).toBe('ARI');
      expect(normalizeTeamName('Pittsburgh Steelers')).toBe('PIT');
      expect(normalizeTeamName('San Francisco 49ers')).toBe('SF');
    });

    test('should handle abbreviations', () => {
      expect(normalizeTeamName('ARI')).toBe('ARI');
      expect(normalizeTeamName('KC')).toBe('KC');
      expect(normalizeTeamName('SF')).toBe('SF');
    });

    test('should handle nicknames', () => {
      expect(normalizeTeamName('Cards')).toBe('ARI');
      expect(normalizeTeamName('Niners')).toBe('SF');
      expect(normalizeTeamName('Chiefs')).toBe('KC');
      expect(normalizeTeamName('Commies')).toBe('WSH');
    });

    test('should handle city names', () => {
      expect(normalizeTeamName('Arizona')).toBe('ARI');
      expect(normalizeTeamName('Kansas City')).toBe('KC');
      expect(normalizeTeamName('Tampa Bay')).toBe('TB');
    });

    test('should be case insensitive', () => {
      expect(normalizeTeamName('cardinals')).toBe('ARI');
      expect(normalizeTeamName('STEELERS')).toBe('PIT');
      expect(normalizeTeamName('ChIeFs')).toBe('KC');
    });

    test('should handle singular forms', () => {
      expect(normalizeTeamName('Cardinal')).toBe('ARI');
      expect(normalizeTeamName('Steeler')).toBe('PIT');
      expect(normalizeTeamName('Bill')).toBe('BUF');
    });

    test('should handle partial matches (typos)', () => {
      expect(normalizeTeamName('bengal')).toBe('CIN');
      expect(normalizeTeamName('patriot')).toBe('NE');
    });

    test('should handle common variations', () => {
      expect(normalizeTeamName('Bucs')).toBe('TB');
      expect(normalizeTeamName('Phins')).toBe('MIA');
      expect(normalizeTeamName('Vikes')).toBe('MIN');
    });

    test('should return uppercase for unknown teams', () => {
      // Note: "Unknown Team" contains "no" which matches Saints, so use different example
      // Non-alphanumeric characters are stripped, so spaces are removed
      expect(normalizeTeamName('Fake Team XYZ')).toBe('FAKETEAMXYZ');
    });

    test('should handle whitespace', () => {
      expect(normalizeTeamName('  Cardinals  ')).toBe('ARI');
      expect(normalizeTeamName('Green Bay')).toBe('GB');
    });
  });

  describe('getWeekFromDate', () => {
    test('should parse date in YYYYMMDD format', () => {
      const result = getWeekFromDate('20250904');
      expect(result.year).toBe(2025);
      expect(result.week).toBeGreaterThan(0);
    });

    test('should parse date in YYYY-MM-DD format', () => {
      const result = getWeekFromDate('2025-09-04');
      expect(result.year).toBe(2025);
      expect(result.week).toBeGreaterThan(0);
    });

    test('should parse date in MM/DD/YYYY format', () => {
      const result = getWeekFromDate('09/04/2025');
      expect(result.year).toBe(2025);
      expect(result.week).toBeGreaterThan(0);
    });

    test('should parse date in M/D/YYYY format (single digits)', () => {
      const result = getWeekFromDate('9/4/2025');
      expect(result.year).toBe(2025);
      expect(result.week).toBeGreaterThan(0);
    });

    test('should parse MM/DD/YYYY with leading zeros', () => {
      const result = getWeekFromDate('10/09/2025');
      expect(result.year).toBe(2025);
      expect(result.week).toBeGreaterThanOrEqual(5);
      expect(result.week).toBeLessThanOrEqual(7);
    });

    test('should calculate week 1 for first Thursday of September', () => {
      // 2025: September 4th is first Thursday
      const result = getWeekFromDate('20250904');
      expect(result.week).toBe(1);
    });

    test('should calculate correct week for mid-season date', () => {
      // October 17, 2025 should be around week 7
      const result = getWeekFromDate('20251017');
      expect(result.year).toBe(2025);
      expect(result.week).toBeGreaterThanOrEqual(6);
      expect(result.week).toBeLessThanOrEqual(8);
    });

    test('should handle dates before season start', () => {
      const result = getWeekFromDate('20250801'); // August, before season
      expect(result.week).toBe(1); // Should default to week 1
    });

    test('should throw error for invalid format', () => {
      expect(() => getWeekFromDate('2025/09/04')).toThrow('Invalid date format');
      expect(() => getWeekFromDate('invalid')).toThrow('Invalid date format');
      expect(() => getWeekFromDate('12345')).toThrow('Invalid date format');
    });

    test('should handle different years', () => {
      const result2024 = getWeekFromDate('20240905');
      const result2025 = getWeekFromDate('20250904');
      
      expect(result2024.year).toBe(2024);
      expect(result2025.year).toBe(2025);
    });
  });

  describe('toTitleCase', () => {
    test('should convert string to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('THE QUICK BROWN FOX')).toBe('The Quick Brown Fox');
    });

    test('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });

    test('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });

    test('should handle already title cased string', () => {
      expect(toTitleCase('Hello World')).toBe('Hello World');
    });
  });

  describe('safeJsonParse', () => {
    test('should parse valid JSON', () => {
      const json = '{"name": "test", "value": 123}';
      const result = safeJsonParse(json);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    test('should return null for invalid JSON', () => {
      const result = safeJsonParse('not valid json');
      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = safeJsonParse('');
      expect(result).toBeNull();
    });
  });

  describe('formatDate', () => {
    test('should format valid date', () => {
      const date = new Date('2025-10-17T14:30:00');
      const formatted = formatDate(date);
      expect(formatted).toContain('2025');
      expect(formatted).toContain('Oct');
    });

    test('should return "Invalid Date" for null', () => {
      expect(formatDate(null)).toBe('Invalid Date');
    });

    test('should return "Invalid Date" for non-date object', () => {
      expect(formatDate('not a date')).toBe('Invalid Date');
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      Logger.log.mockClear();
    });

    test('should log error with function name and message', () => {
      const error = new Error('Test error');
      logError('testFunction', error);
      
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('ERROR in testFunction'));
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });
  });
});

