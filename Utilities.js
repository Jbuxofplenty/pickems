/**
 * Utilities.js - Helper functions for the NFL Pick'Ems application
 */

/**
 * Gets the current NFL year from ESPN API
 * @return {number} Current NFL season year
 */
function getCurrentYear() {
  var url = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  return data.season.year;
}

/**
 * Gets the current NFL week from ESPN API
 * @return {number} Current NFL week number
 */
function getCurrentWeek() {
  var url = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  
  // Only return week number if not preseason
  if (data.events[0] && data.events[0].season.slug !== 'preseason') {
    return data.week.number;
  }
  return 1;
}

/**
 * Creates or gets a sheet by name
 * @param {string} sheetName - Name of sheet to get or create
 * @return {Sheet} The sheet object
 */
function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  return sheet;
}

/**
 * Formats a date for display
 * @param {Date} date - Date object to format
 * @return {string} Formatted date string
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) {
    return 'Invalid Date';
  }
  
  var options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Logs an error with context
 * @param {string} functionName - Name of function where error occurred
 * @param {Error} error - The error object
 */
function logError(functionName, error) {
  Logger.log('ERROR in ' + functionName + ': ' + error.message);
  Logger.log('Stack trace: ' + error.stack);
}

/**
 * Converts string to title case
 * @param {string} str - String to convert
 * @return {string} Title cased string
 */
function toTitleCase(str) {
  if (!str) return '';
  
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @return {Object|null} Parsed object or null if error
 */
function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    logError('safeJsonParse', e);
    return null;
  }
}

