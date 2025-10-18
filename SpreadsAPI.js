/**
 * SpreadsAPI.js - Handles fetching betting spreads from ESPN API
 */

/**
 * Fetches spreads data from ESPN API for current week
 * @return {Array} Array of game objects with spread information
 */
function getSpreadsFromESPN() {
  var url = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  
  var week = data.week.number;
  var year = data.season.year;
  var games = data.events;
  
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

