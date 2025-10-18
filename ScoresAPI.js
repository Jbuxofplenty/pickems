/**
 * ScoresAPI.js - Handles fetching final scores from ESPN API
 */

/**
 * Fetches final scores from ESPN API for current week
 * @return {Array} Array of game objects with final scores
 */
function getScoresFromESPN() {
  var url = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  
  var week = data.week.number;
  var year = data.season.year;
  var games = data.events;
  
  var scoresData = [];
  
  for (var i = 0; i < games.length; i++) {
    var game = games[i];
    var competition = game.competitions[0];
    var competitors = competition.competitors;
    var status = game.status.type;
    
    // Get teams
    var homeTeam = competitors.find(function(c) { return c.homeAway === 'home'; });
    var awayTeam = competitors.find(function(c) { return c.homeAway === 'away'; });
    
    // Get scores
    var awayScore = awayTeam.score || 0;
    var homeScore = homeTeam.score || 0;
    
    // Determine winner
    var winner = '';
    if (status.completed) {
      if (parseInt(homeScore) > parseInt(awayScore)) {
        winner = homeTeam.team.abbreviation;
      } else if (parseInt(awayScore) > parseInt(homeScore)) {
        winner = awayTeam.team.abbreviation;
      } else {
        winner = 'TIE';
      }
    }
    
    scoresData.push({
      week: week,
      year: year,
      gameId: game.id,
      date: new Date(game.date),
      awayTeam: awayTeam.team.abbreviation,
      awayTeamName: awayTeam.team.displayName,
      awayScore: awayScore,
      homeTeam: homeTeam.team.abbreviation,
      homeTeamName: homeTeam.team.displayName,
      homeScore: homeScore,
      winner: winner,
      completed: status.completed,
      status: status.description
    });
  }
  
  return scoresData;
}

/**
 * Writes scores data to the Scores sheet
 * @param {Array} scoresData - Array of score objects
 */
function writeScoresToSheet(scoresData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Scores');
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Scores');
  }
  
  // Clear existing data
  sheet.clear();
  
  // Set headers
  var headers = ['Week', 'Year', 'Game ID', 'Date', 'Away Team', 'Away Team Name', 
                 'Away Score', 'Home Team', 'Home Team Name', 'Home Score', 
                 'Winner', 'Completed', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Write data
  if (scoresData.length > 0) {
    var rows = [];
    for (var i = 0; i < scoresData.length; i++) {
      var game = scoresData[i];
      rows.push([
        game.week,
        game.year,
        game.gameId,
        game.date,
        game.awayTeam,
        game.awayTeamName,
        game.awayScore,
        game.homeTeam,
        game.homeTeamName,
        game.homeScore,
        game.winner,
        game.completed,
        game.status
      ]);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    
    // Highlight completed games
    for (var i = 0; i < scoresData.length; i++) {
      if (scoresData[i].completed) {
        sheet.getRange(i + 2, 1, 1, headers.length).setBackground('#d4edda');
      }
    }
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('Scores written to sheet: ' + scoresData.length + ' games');
}

