/**
 * PicksChecker.js - Validates user picks against actual game results
 */

/**
 * Validates picks from Picks sheet against results in Scores sheet
 * @return {Object} Summary of pick validation results
 */
function validatePicks() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get Picks sheet
  var picksSheet = ss.getSheetByName('Picks');
  if (!picksSheet) {
    throw new Error('Picks sheet not found. Please create a sheet named "Picks" with your picks.');
  }
  
  // Get Scores sheet
  var scoresSheet = ss.getSheetByName('Scores');
  if (!scoresSheet) {
    throw new Error('Scores sheet not found. Please fetch scores first.');
  }
  
  // Read picks data (expecting columns: Player, Game ID or Matchup, Pick)
  var picksData = picksSheet.getDataRange().getValues();
  if (picksData.length < 2) {
    throw new Error('No picks found in Picks sheet.');
  }
  
  // Read scores data
  var scoresData = scoresSheet.getDataRange().getValues();
  if (scoresData.length < 2) {
    throw new Error('No scores found in Scores sheet.');
  }
  
  // Build lookup map of winners by game
  var winnersMap = buildWinnersMap(scoresData);
  
  // Check picks
  var results = checkPicksAgainstWinners(picksData, winnersMap);
  
  // Write results back to Picks sheet
  writePickResults(picksSheet, picksData, results);
  
  return {
    total: results.total,
    correct: results.correct,
    incorrect: results.incorrect,
    pending: results.pending
  };
}

/**
 * Builds a map of winners from scores data
 * @param {Array} scoresData - 2D array from Scores sheet
 * @return {Object} Map of gameId/matchup to winner
 */
function buildWinnersMap(scoresData) {
  var map = {};
  
  // Skip header row
  for (var i = 1; i < scoresData.length; i++) {
    var row = scoresData[i];
    var gameId = row[2]; // Game ID column
    var awayTeam = row[4]; // Away Team
    var homeTeam = row[7]; // Home Team
    var winner = row[10]; // Winner
    var completed = row[11]; // Completed
    
    // Store by game ID
    if (gameId) {
      map[gameId] = {
        winner: winner,
        completed: completed,
        awayTeam: awayTeam,
        homeTeam: homeTeam
      };
    }
    
    // Also store by matchup string for flexibility
    var matchup = awayTeam + '@' + homeTeam;
    map[matchup] = {
      winner: winner,
      completed: completed,
      awayTeam: awayTeam,
      homeTeam: homeTeam
    };
  }
  
  return map;
}

/**
 * Checks picks against winners map
 * @param {Array} picksData - 2D array from Picks sheet
 * @param {Object} winnersMap - Map of game results
 * @return {Object} Results object with counts and details
 */
function checkPicksAgainstWinners(picksData, winnersMap) {
  var results = {
    total: 0,
    correct: 0,
    incorrect: 0,
    pending: 0,
    details: []
  };
  
  // Skip header row
  for (var i = 1; i < picksData.length; i++) {
    var row = picksData[i];
    var player = row[0];
    var gameIdentifier = row[1]; // Could be game ID or matchup
    var pick = row[2];
    
    if (!player || !gameIdentifier || !pick) {
      continue; // Skip empty rows
    }
    
    results.total++;
    
    // Look up game result
    var gameResult = winnersMap[gameIdentifier];
    
    if (!gameResult) {
      results.details.push({
        index: i,
        result: 'GAME NOT FOUND'
      });
      continue;
    }
    
    // Check if game is completed
    if (!gameResult.completed) {
      results.pending++;
      results.details.push({
        index: i,
        result: 'PENDING'
      });
      continue;
    }
    
    // Check if pick matches winner
    if (pick === gameResult.winner) {
      results.correct++;
      results.details.push({
        index: i,
        result: 'CORRECT'
      });
    } else {
      results.incorrect++;
      results.details.push({
        index: i,
        result: 'INCORRECT'
      });
    }
  }
  
  return results;
}

/**
 * Writes pick validation results back to Picks sheet
 * @param {Sheet} sheet - Picks sheet
 * @param {Array} picksData - Original picks data
 * @param {Object} results - Validation results
 */
function writePickResults(sheet, picksData, results) {
  // Add "Result" column header if not exists
  var headers = picksData[0];
  var resultColIndex = headers.indexOf('Result');
  
  if (resultColIndex === -1) {
    resultColIndex = headers.length;
    sheet.getRange(1, resultColIndex + 1).setValue('Result').setFontWeight('bold');
  }
  
  // Write results
  for (var i = 0; i < results.details.length; i++) {
    var detail = results.details[i];
    var rowIndex = detail.index + 1; // Convert to 1-based
    var cell = sheet.getRange(rowIndex, resultColIndex + 1);
    
    cell.setValue(detail.result);
    
    // Color code the result
    if (detail.result === 'CORRECT') {
      cell.setBackground('#d4edda').setFontColor('#155724');
    } else if (detail.result === 'INCORRECT') {
      cell.setBackground('#f8d7da').setFontColor('#721c24');
    } else if (detail.result === 'PENDING') {
      cell.setBackground('#fff3cd').setFontColor('#856404');
    } else {
      cell.setBackground('#f8f9fa').setFontColor('#6c757d');
    }
  }
  
  Logger.log('Pick results written to sheet');
}

