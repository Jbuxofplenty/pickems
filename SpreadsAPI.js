/**
 * SpreadsAPI.js - Handles fetching betting spreads from ESPN API
 * 
 * This module fetches NFL betting lines from ESPN's scoreboard API.
 * Includes:
 * - Point spreads (e.g., "-5.5" for favorites)
 * - Over/Under totals (e.g., "47.5")
 * 
 * Note: ESPN typically only provides odds for current/upcoming games.
 * Historical spreads are not available through this API.
 */

// ===================================================================
// API DATA FETCHING
// ===================================================================

/**
 * Fetches spreads data from ESPN API for current week or specific date
 * Note: ESPN typically only provides spreads for current/upcoming games
 * @param {string} dateString - Optional date in format YYYYMMDD or YYYY-MM-DD. Fetches all games for the week containing that date. Uses current week if not provided.
 * @return {Array} Array of game objects with spread information
 */
function getSpreadsFromESPN(dateString) {
  var url = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  
  // Add week parameter if date provided - this gets ALL games for that week
  if (dateString) {
    var weekInfo = getWeekFromDate(dateString);
    // Use week and seasontype parameters to get all games for the week
    url += '?seasontype=2&week=' + weekInfo.week;
    Logger.log('Input date: ' + dateString + ' -> Using Week ' + weekInfo.week + ' of ' + weekInfo.year);
  }
  
  Logger.log('Fetching from URL: ' + url);
  
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  
  // Handle cases where week or season might not be defined
  var week = (data.week && data.week.number) ? data.week.number : 'N/A';
  var year = (data.season && data.season.year) ? data.season.year : new Date().getFullYear();
  var games = data.events || [];
  
  Logger.log('Week: ' + week + ', Year: ' + year + ', Games found: ' + games.length);
  
  if (games.length === 0) {
    Logger.log('No games found for the specified date');
  }
  
  var spreadsData = [];
  
  for (var i = 0; i < games.length; i++) {
    var game = games[i];
    var competition = game.competitions[0];
    var competitors = competition.competitors;
    
    // Get teams
    var homeTeam = competitors.find(function(c) { return c.homeAway === 'home'; });
    var awayTeam = competitors.find(function(c) { return c.homeAway === 'away'; });
    
    // Get odds/spread if available
    var spread = 'N/A';
    var overUnder = 'N/A';
    
    if (competition.odds && competition.odds.length > 0) {
      var odds = competition.odds[0];
      spread = odds.details || 'N/A';
      overUnder = odds.overUnder || 'N/A';
    }
    
    spreadsData.push({
      week: week,
      year: year,
      gameId: game.id,
      date: new Date(game.date),
      awayTeam: awayTeam.team.abbreviation,
      awayTeamName: awayTeam.team.displayName,
      homeTeam: homeTeam.team.abbreviation,
      homeTeamName: homeTeam.team.displayName,
      spread: spread,
      overUnder: overUnder,
      status: game.status.type.description
    });
  }
  
  return spreadsData;
}

// ===================================================================
// SPREADSHEET WRITING
// ===================================================================

/**
 * Writes spreads data to the Spreads sheet
 * @param {Array} spreadsData - Array of spread objects
 */
function writeSpreadsToSheet(spreadsData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Spreads');
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Spreads');
  }
  
  // Clear existing data
  sheet.clear();
  
  // Set headers
  var headers = ['Week', 'Year', 'Game ID', 'Date', 'Away Team', 'Away Team Name', 
                 'Home Team', 'Home Team Name', 'Spread', 'Over/Under', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Write data
  if (spreadsData.length > 0) {
    var rows = [];
    for (var i = 0; i < spreadsData.length; i++) {
      var game = spreadsData[i];
      rows.push([
        game.week,
        game.year,
        game.gameId,
        game.date,
        game.awayTeam,
        game.awayTeamName,
        game.homeTeam,
        game.homeTeamName,
        game.spread,
        game.overUnder,
        game.status
      ]);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('Spreads written to sheet: ' + spreadsData.length + ' games');
}
