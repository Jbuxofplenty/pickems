/**
 * Utilities.js - Helper functions for the NFL Pick'Ems application
 * 
 * This module provides shared utility functions used across the application:
 * - ESPN API helpers (current week/year)
 * - Date and time utilities
 * - Team name normalization
 * - Spreadsheet helpers
 * - Error handling and logging
 */

// ===================================================================
// ESPN API HELPERS
// ===================================================================

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

// ===================================================================
// SPREADSHEET HELPERS
// ===================================================================

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

// ===================================================================
// DATE AND TIME UTILITIES
// ===================================================================

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

// ===================================================================
// ERROR HANDLING AND LOGGING
// ===================================================================

/**
 * Logs an error with context
 * @param {string} functionName - Name of function where error occurred
 * @param {Error} error - The error object
 */
function logError(functionName, error) {
  Logger.log('ERROR in ' + functionName + ': ' + error.message);
  Logger.log('Stack trace: ' + error.stack);
}

// ===================================================================
// STRING UTILITIES
// ===================================================================

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

// ===================================================================
// NFL-SPECIFIC UTILITIES
// ===================================================================

/**
 * Calculates NFL week number from a given date
 * NFL regular season typically starts first Thursday of September
 * @param {string} dateString - Date in format YYYYMMDD or YYYY-MM-DD
 * @return {Object} Object with year and week number {year: 2025, week: 7}
 */
function getWeekFromDate(dateString) {
  // Parse the input date
  var cleaned = dateString.replace(/-/g, '');
  
  // Validate format (should be 8 digits)
  if (!/^\d{8}$/.test(cleaned)) {
    throw new Error('Invalid date format. Please use YYYYMMDD or YYYY-MM-DD (e.g., 20250904 or 2025-09-04)');
  }
  
  // Parse date components
  var year = parseInt(cleaned.substring(0, 4));
  var month = parseInt(cleaned.substring(4, 6)) - 1; // JavaScript months are 0-indexed
  var day = parseInt(cleaned.substring(6, 8));
  
  var inputDate = new Date(year, month, day);
  
  // NFL season typically starts first Thursday of September
  // Find first Thursday of September for that year
  var seasonStart = new Date(year, 8, 1); // September 1st
  var dayOfWeek = seasonStart.getDay();
  var daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0 && dayOfWeek !== 4) {
    daysUntilThursday = 7;
  }
  seasonStart.setDate(seasonStart.getDate() + daysUntilThursday);
  
  // Calculate weeks difference
  var diffTime = inputDate - seasonStart;
  var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  var week = Math.floor(diffDays / 7) + 1;
  
  // Ensure week is at least 1
  if (week < 1) {
    week = 1;
  }
  
  return {
    year: year,
    week: week
  };
}

/**
 * Normalizes team name to match ESPN API abbreviations
 * Very lenient matching to handle typos and various formats
 * @param {string} teamName - Team name from user pick (can be full name, nickname, abbreviation, etc.)
 * @return {string} Normalized 2-3 letter team abbreviation matching ESPN API format
 */
function normalizeTeamName(teamName) {
  var normalized = teamName.trim().toLowerCase();
  
  // Team abbreviation mappings (all lowercase keys for case-insensitive matching)
  var teamMap = {
    // Arizona Cardinals
    'cards': 'ARI', 'card': 'ARI', 'cardinals': 'ARI', 'cardinal': 'ARI', 'ari': 'ARI', 'arizona': 'ARI',
    // Atlanta Falcons
    'falcons': 'ATL', 'falcon': 'ATL', 'atl': 'ATL', 'atlanta': 'ATL',
    // Baltimore Ravens
    'ravens': 'BAL', 'raven': 'BAL', 'bal': 'BAL', 'baltimore': 'BAL',
    // Buffalo Bills
    'bills': 'BUF', 'bill': 'BUF', 'buf': 'BUF', 'buffalo': 'BUF',
    // Carolina Panthers
    'panthers': 'CAR', 'panther': 'CAR', 'car': 'CAR', 'carolina': 'CAR',
    // Chicago Bears
    'bears': 'CHI', 'bear': 'CHI', 'chi': 'CHI', 'chicago': 'CHI',
    // Cincinnati Bengals
    'bengals': 'CIN', 'bengal': 'CIN', 'cin': 'CIN', 'cincinnati': 'CIN',
    // Cleveland Browns
    'browns': 'CLE', 'brown': 'CLE', 'cle': 'CLE', 'cleveland': 'CLE',
    // Dallas Cowboys
    'cowboys': 'DAL', 'cowboy': 'DAL', 'dal': 'DAL', 'dallas': 'DAL',
    // Denver Broncos
    'broncos': 'DEN', 'bronco': 'DEN', 'den': 'DEN', 'denver': 'DEN',
    // Detroit Lions
    'lions': 'DET', 'lion': 'DET', 'det': 'DET', 'detroit': 'DET',
    // Green Bay Packers
    'packers': 'GB', 'packer': 'GB', 'gb': 'GB', 'greenbay': 'GB', 'green bay': 'GB',
    // Houston Texans
    'texans': 'HOU', 'texan': 'HOU', 'hou': 'HOU', 'houston': 'HOU',
    // Indianapolis Colts
    'colts': 'IND', 'colt': 'IND', 'ind': 'IND', 'indianapolis': 'IND', 'indy': 'IND',
    // Jacksonville Jaguars
    'jaguars': 'JAX', 'jaguar': 'JAX', 'jags': 'JAX', 'jag': 'JAX', 'jax': 'JAX', 'jacksonville': 'JAX',
    // Kansas City Chiefs
    'chiefs': 'KC', 'chief': 'KC', 'kc': 'KC', 'kansas city': 'KC', 'kansascity': 'KC',
    // Las Vegas Raiders
    'raiders': 'LV', 'raider': 'LV', 'lv': 'LV', 'las vegas': 'LV', 'lasvegas': 'LV', 'vegas': 'LV',
    // Los Angeles Chargers
    'chargers': 'LAC', 'charger': 'LAC', 'lac': 'LAC', 'la chargers': 'LAC',
    // Los Angeles Rams
    'rams': 'LAR', 'ram': 'LAR', 'lar': 'LAR', 'la rams': 'LAR',
    // Miami Dolphins
    'dolphins': 'MIA', 'dolphin': 'MIA', 'mia': 'MIA', 'miami': 'MIA', 'phins': 'MIA',
    // Minnesota Vikings
    'vikings': 'MIN', 'viking': 'MIN', 'min': 'MIN', 'minnesota': 'MIN', 'vikes': 'MIN',
    // New England Patriots
    'patriots': 'NE', 'patriot': 'NE', 'ne': 'NE', 'pats': 'NE', 'new england': 'NE', 'newengland': 'NE',
    // New Orleans Saints
    'saints': 'NO', 'saint': 'NO', 'no': 'NO', 'new orleans': 'NO', 'neworleans': 'NO',
    // New York Giants
    'giants': 'NYG', 'giant': 'NYG', 'nyg': 'NYG', 'ny giants': 'NYG',
    // New York Jets
    'jets': 'NYJ', 'jet': 'NYJ', 'nyj': 'NYJ', 'ny jets': 'NYJ',
    // Philadelphia Eagles
    'eagles': 'PHI', 'eagle': 'PHI', 'phi': 'PHI', 'philadelphia': 'PHI', 'philly': 'PHI',
    // Pittsburgh Steelers
    'steelers': 'PIT', 'steeler': 'PIT', 'pit': 'PIT', 'pittsburgh': 'PIT',
    // San Francisco 49ers
    '49ers': 'SF', '49er': 'SF', 'niners': 'SF', 'niner': 'SF', 'sf': 'SF', 'san francisco': 'SF', 'sanfrancisco': 'SF',
    // Seattle Seahawks
    'seahawks': 'SEA', 'seahawk': 'SEA', 'sea': 'SEA', 'seattle': 'SEA', 'hawks': 'SEA',
    // Tampa Bay Buccaneers
    'buccaneers': 'TB', 'buccaneer': 'TB', 'bucs': 'TB', 'buc': 'TB', 'tb': 'TB', 'tampa bay': 'TB', 'tampabay': 'TB', 'tampa': 'TB',
    // Tennessee Titans
    'titans': 'TEN', 'titan': 'TEN', 'ten': 'TEN', 'tennessee': 'TEN',
    // Washington Commanders
    'commanders': 'WSH', 'commander': 'WSH', 'command': 'WSH', 'wsh': 'WSH', 'washington': 'WSH'
  };
  
  // Try direct match first
  if (teamMap[normalized]) {
    return teamMap[normalized];
  }
  
  // Try partial match (contains) as fallback for typos
  for (var key in teamMap) {
    if (normalized.indexOf(key) !== -1 || key.indexOf(normalized) !== -1) {
      return teamMap[key];
    }
  }
  
  // Return uppercase original if no match found
  return normalized.toUpperCase();
}

