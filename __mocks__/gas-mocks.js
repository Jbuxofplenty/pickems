/**
 * gas-mocks.js - Mock implementations of Google Apps Script services for testing
 */

// Mock Logger
global.Logger = {
  log: jest.fn(),
};

// Mock UrlFetchApp
global.UrlFetchApp = {
  fetch: jest.fn(),
};

// Mock SpreadsheetApp
const createMockRange = (row, col, numRows, numCols, values = []) => ({
  getRow: () => row,
  getColumn: () => col,
  getNumRows: () => numRows,
  getNumColumns: () => numCols,
  getValues: jest.fn(() => values),
  setValues: jest.fn(),
  getValue: jest.fn(() => values[0] && values[0][0]),
  setValue: jest.fn(),
  setBackground: jest.fn(),
  setFontColor: jest.fn(),
  setFontSize: jest.fn(),
  setFontWeight: jest.fn(),
  setWrap: jest.fn(),
});

const createMockSheet = (name, data = []) => ({
  getName: () => name,
  clear: jest.fn(),
  getRange: jest.fn((row, col, numRows, numCols) => {
    if (numRows === undefined) {
      return createMockRange(row, col, 1, 1, [[data[row - 1]?.[col - 1]]]);
    }
    return createMockRange(row, col, numRows || 1, numCols || 1);
  }),
  getDataRange: jest.fn(() => createMockRange(1, 1, data.length, data[0]?.length || 0, data)),
  autoResizeColumns: jest.fn(),
  getLastRow: jest.fn(() => data.length),
  getLastColumn: jest.fn(() => data[0]?.length || 0),
});

const createMockSpreadsheet = (sheets = []) => ({
  getSheets: jest.fn(() => sheets),
  getSheetByName: jest.fn((name) => sheets.find(s => s.getName() === name)),
  insertSheet: jest.fn((name) => {
    const newSheet = createMockSheet(name);
    sheets.push(newSheet);
    return newSheet;
  }),
});

global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(),
  getUi: jest.fn(() => ({
    alert: jest.fn(),
    prompt: jest.fn(),
    Button: {
      OK: 'OK',
      CANCEL: 'CANCEL',
      YES: 'YES',
      NO: 'NO',
    },
    ButtonSet: {
      OK: 'OK',
      OK_CANCEL: 'OK_CANCEL',
      YES_NO: 'YES_NO',
    },
  })),
};

// Helper to create mock spreadsheet with data
const createMockSpreadsheetWithData = (sheetsData) => {
  const sheets = Object.entries(sheetsData).map(([name, data]) => 
    createMockSheet(name, data)
  );
  return createMockSpreadsheet(sheets);
};

// Helper to create mock API response
const createMockApiResponse = (data) => ({
  getContentText: () => JSON.stringify(data),
  getResponseCode: () => 200,
});

module.exports = {
  createMockRange,
  createMockSheet,
  createMockSpreadsheet,
  createMockSpreadsheetWithData,
  createMockApiResponse,
};

