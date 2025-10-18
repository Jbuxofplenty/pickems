/**
 * PicksChecker.js - Validates user picks against actual game results
 * 
 * This module handles the validation of NFL picks by:
 * 1. Reading picks from the main spreadsheet
 * 2. Matching picks against game results from ESPN API data
 * 3. Evaluating picks based on spreads and over/under lines
 * 4. Writing results back to the spreadsheet with visual feedback
 * 
 * Supports:
 * - Spread picks (e.g., "Cardinals -5.5")
 * - Over/Under picks (e.g., "Rams/Jags O 44.5")
 * - Lenient team name matching (handles typos, nicknames, abbreviations)
 */

// ===================================================================
// MAIN VALIDATION ORCHESTRATION
// ===================================================================

/**
 * Validates picks from Picks sheet against results in Scores and Spreads sheets
 * @param {string} sheetName - Optional name of the sheet containing picks. Defaults to first sheet if not provided.
 * @return {Object} Summary of pick validation results
 */
function validatePicks(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get required sheets
  var picksSheet;
  if (sheetName) {
    picksSheet = ss.getSheetByName(sheetName);
    if (!picksSheet) {
      throw new Error('Sheet "' + sheetName + '" not found. Please create a sheet with that name or leave blank to use the first sheet.');
    }
  } else {
    // Default to first sheet if no name provided
    picksSheet = ss.getSheets()[0];
    if (!picksSheet) {
      throw new Error('No sheets found in spreadsheet.');
    }
  }
  
  var scoresSheet = ss.getSheetByName('Scores');
  if (!scoresSheet) {
    throw new Error('Scores sheet not found. Please fetch scores first.');
  }
  
  var spreadsSheet = ss.getSheetByName('Spreads');
  if (!spreadsSheet) {
    throw new Error('Spreads sheet not found. Please fetch spreads first.');
  }
  
  // Read all data
  var picksData = picksSheet.getDataRange().getValues();
  var scoresData = scoresSheet.getDataRange().getValues();
  var spreadsData = spreadsSheet.getDataRange().getValues();
  
  if (picksData.length < 2) {
    throw new Error('No picks found in Picks sheet.');
  }
  
  // Build game lookup maps
  var gamesMap = buildGamesMap(scoresData, spreadsData);
  
  // Log the date range
  Logger.log('======================================');
  if (gamesMap.earliestGameDate && gamesMap.latestGameDate) {
    Logger.log('SCORE DATA DATE RANGE: ' + 
               gamesMap.earliestGameDate.toLocaleDateString() + ' to ' + 
               gamesMap.latestGameDate.toLocaleDateString());
  } else {
    Logger.log('NO SCORE DATA FOUND');
  }
  Logger.log('======================================');
  
  // Process picks and calculate results
  var results = processPicks(picksData, gamesMap);
  
  Logger.log('=== PICKS VALIDATION SUMMARY ===');
  Logger.log('Total picks evaluated: ' + results.total);
  Logger.log('Correct: ' + results.correct);
  Logger.log('Incorrect: ' + results.incorrect);
  Logger.log('Pending: ' + results.pending);
  
  // Show preview and get confirmation
  var ui = SpreadsheetApp.getUi();
  var dateRange = '';
  if (gamesMap.earliestGameDate && gamesMap.latestGameDate) {
    dateRange = gamesMap.earliestGameDate.toLocaleDateString() + ' - ' + 
                gamesMap.latestGameDate.toLocaleDateString();
  }
  var confirmed = showPreviewAndConfirm(ui, picksSheet, picksData, results, dateRange);
  
  if (confirmed) {
    // Write results back to column C
    writeResults(picksSheet, results);
    Logger.log('Results written to sheet');
  } else {
    Logger.log('User cancelled - no changes made');
  }
  
  return {
    total: results.total,
    correct: results.correct,
    incorrect: results.incorrect,
    pending: results.pending,
    committed: confirmed
  };
}

// ===================================================================
// GAME DATA PROCESSING
// ===================================================================

/**
 * Builds a comprehensive map of games with scores and spreads
 * @param {Array} scoresData - 2D array from Scores sheet
 * @param {Array} spreadsData - 2D array from Spreads sheet
 * @return {Object} Map of games by team abbreviations and available game dates
 */
function buildGamesMap(scoresData, spreadsData) {
  var map = {
    games: {},
    gameDates: [],  // Track actual game dates from score data
    earliestGameDate: null,
    latestGameDate: null
  };
  
  // Process scores data (skip header row)
  for (var i = 1; i < scoresData.length; i++) {
    var row = scoresData[i];
    var week = row[0];
    var gameId = row[2];
    var gameDate = row[3];  // Date column (D)
    var awayTeam = row[4];  // Away Team abbreviation
    var awayScore = parseInt(row[6]) || 0;  // Away Score
    var homeTeam = row[7];  // Home Team abbreviation
    var homeScore = parseInt(row[9]) || 0;  // Home Score
    
    // Handle completed status - can be boolean or string "TRUE"/"FALSE"
    var completed = row[11];
    if (typeof completed === 'string') {
      completed = completed.toUpperCase() === 'TRUE';
    }
    
    if (!gameId || !awayTeam || !homeTeam) continue;
    
    // Track game dates for range checking
    if (gameDate) {
      // Google Sheets may return Date objects or strings - handle both
      var parsedDate;
      if (gameDate instanceof Date) {
        parsedDate = new Date(gameDate.getTime()); // Create a copy
      } else {
        parsedDate = new Date(gameDate);
      }
      
      // Only add valid dates
      if (!isNaN(parsedDate.getTime())) {
        // Normalize to midnight for consistent comparison
        parsedDate.setHours(0, 0, 0, 0);
        map.gameDates.push(parsedDate);
        
        if (!map.earliestGameDate || parsedDate < map.earliestGameDate) {
          map.earliestGameDate = new Date(parsedDate.getTime());
        }
        if (!map.latestGameDate || parsedDate > map.latestGameDate) {
          map.latestGameDate = new Date(parsedDate.getTime());
        }
      } else {
        Logger.log('Invalid date for game ' + gameId + ': ' + gameDate);
      }
    }
    
    var gameKey = awayTeam + '@' + homeTeam;
    
    map.games[gameKey] = {
      week: week,
      gameId: gameId,
      awayTeam: awayTeam,
      homeTeam: homeTeam,
      awayScore: awayScore,
      homeScore: homeScore,
      totalPoints: awayScore + homeScore,
      completed: completed,
      spread: null,
      overUnder: null
    };
    
    // Also store by individual team for easier lookup
    if (!map.games[awayTeam]) map.games[awayTeam] = [];
    if (!map.games[homeTeam]) map.games[homeTeam] = [];
    map.games[awayTeam].push(map.games[gameKey]);
    map.games[homeTeam].push(map.games[gameKey]);
  }
  
  // Add spreads data
  for (var i = 1; i < spreadsData.length; i++) {
    var row = spreadsData[i];
    var awayTeam = row[4];  // Away Team abbreviation
    var homeTeam = row[6];  // Home Team abbreviation
    var spread = row[8];    // Spread
    var overUnder = row[9]; // Over/Under
    
    if (!awayTeam || !homeTeam) continue;
    
    var gameKey = awayTeam + '@' + homeTeam;
    if (map.games[gameKey]) {
      map.games[gameKey].spread = spread;
      map.games[gameKey].overUnder = parseFloat(overUnder) || null;
    }
  }
  
  if (map.earliestGameDate && map.latestGameDate) {
    Logger.log('Score data date range: ' + 
               map.earliestGameDate.toLocaleDateString() + ' to ' + 
               map.latestGameDate.toLocaleDateString());
    Logger.log('Total games with dates: ' + map.gameDates.length);
  } else {
    Logger.log('WARNING: No valid game dates found in Scores sheet!');
  }
  
  return map;
}

/**
 * Checks if score data exists for games in the same week as the given date
 * Week runs from Thursday (start date) through next Wednesday
 * @param {Date} weekStartDate - Thursday start date from picks sheet (column E)
 * @param {Object} gamesMap - Map of game results
 * @return {boolean} True if any game dates fall within this week's range
 */
function checkIfScoreDataExists(weekStartDate, gamesMap) {
  if (!gamesMap.earliestGameDate || !gamesMap.latestGameDate) {
    Logger.log('No game dates available in gamesMap');
    return false;
  }
  
  // Define the week range: Thursday (start) to next Wednesday (end)
  var weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  
  var weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Thursday + 6 days = next Wednesday
  weekEnd.setHours(23, 59, 59, 999);
  
  Logger.log('Checking week range: ' + weekStart.toLocaleDateString() + ' to ' + weekEnd.toLocaleDateString());
  Logger.log('Against game dates: ' + gamesMap.earliestGameDate.toLocaleDateString() + ' to ' + gamesMap.latestGameDate.toLocaleDateString());
  
  // Check if any game dates fall within this week's range
  var matchCount = 0;
  for (var i = 0; i < gamesMap.gameDates.length; i++) {
    var gameDate = gamesMap.gameDates[i];
    if (gameDate >= weekStart && gameDate <= weekEnd) {
      matchCount++;
    }
  }
  
  Logger.log('Found ' + matchCount + ' games in this week range');
  return matchCount > 0;
}

// ===================================================================
// PICK PROCESSING AND EVALUATION
// ===================================================================

/**
 * Processes all picks and determines if they're correct
 * @param {Array} picksData - 2D array from Picks sheet
 * @param {Object} gamesMap - Map of game results and available weeks
 * @return {Object} Results with details for each row
 */
function processPicks(picksData, gamesMap) {
  var results = {
    total: 0,
    correct: 0,
    incorrect: 0,
    pending: 0,
    rowResults: [],  // Array to store result for each row
    rowDetails: []   // Array to store detailed info for preview
  };
  
  var currentWeek = null;  // Track which week we're currently processing
  var currentWeekDate = null;  // Track the Thursday date for current week
  var hasScoreDataForCurrentWeek = false;
  
  // Process each row starting from row 2 (skip header)
  for (var i = 1; i < picksData.length; i++) {
    var row = picksData[i];
    var playerName = row[0];  // Column A
    var pickText = row[1];    // Column B
    var weekStartDate = row[4]; // Column E - Thursday start date
    
    // Check if this is a week header row (Column A might contain "Week X")
    if (playerName && playerName.toString().indexOf('Week') !== -1) {
      // Extract week number from "Week 1", "Week 2", etc.
      var weekMatch = playerName.toString().match(/Week\s+(\d+)/i);
      if (weekMatch) {
        currentWeek = parseInt(weekMatch[1]);
      }
      
      // Get the week start date from column E
      if (weekStartDate) {
        currentWeekDate = new Date(weekStartDate);
        // Find which week in the scores data matches this date
        hasScoreDataForCurrentWeek = checkIfScoreDataExists(currentWeekDate, gamesMap);
        
        var dateStr = (currentWeekDate.getMonth() + 1) + '/' + currentWeekDate.getDate() + '/' + currentWeekDate.getFullYear();
        if (hasScoreDataForCurrentWeek) {
          Logger.log('=== Processing Week ' + currentWeek + ' (' + dateStr + ') - has score data ===');
        } else {
          Logger.log('=== Skipping Week ' + currentWeek + ' (' + dateStr + ') - no score data available ===');
        }
      }
      
      results.rowResults.push(null);  // No result for header rows
      results.rowDetails.push(null);
      continue;
    }
    
    // Skip empty rows
    if (!pickText || pickText.toString().trim() === '') {
      results.rowResults.push(null);
      results.rowDetails.push(null);
      continue;
    }
    
    // Check if we have score data for this week
    if (!hasScoreDataForCurrentWeek) {
      // Silently skip - don't log for each row
      results.rowResults.push(null);  // Skip picks for weeks without score data
      results.rowDetails.push(null);
      continue;
    }
    
    // Parse the pick
    var parsedPick = parsePick(pickText);
    if (!parsedPick) {
      Logger.log('Row ' + (i + 1) + ': Invalid pick format - "' + pickText + '"');
      results.rowResults.push('invalid');  // Mark as invalid format
      results.rowDetails.push({ error: 'invalid format' });
      continue;
    }
    
    Logger.log('Row ' + (i + 1) + ': Parsed pick - "' + pickText + '" as ' + 
               parsedPick.type + ' pick for Week ' + currentWeek);
    
    // Find the game
    var game = findGame(parsedPick, gamesMap.games);
    if (!game) {
      Logger.log('Row ' + (i + 1) + ': Game not found for "' + pickText + '"');
      results.rowResults.push('notfound');  // Mark as game not found
      results.rowDetails.push({ error: 'game not found' });
      continue;
    }
    
    // Check if game is completed
    if (!game.completed) {
      results.pending++;
      results.total++;
      results.rowResults.push('pending');
      results.rowDetails.push({ status: 'pending' });
      continue;
    }
    
    // Evaluate the pick and capture details
    var isCorrect = evaluatePick(parsedPick, game);
    
    // Build detailed info for preview
    var detail = {
      pickText: pickText,
      type: parsedPick.type,
      isCorrect: isCorrect,
      fuzzyMatches: parsedPick.fuzzyMatches || []  // Track if fuzzy matching was used
    };
    
    if (parsedPick.type === 'overunder') {
      detail.actualTotal = game.totalPoints;
      detail.line = parsedPick.line;
      detail.direction = parsedPick.direction;
    } else if (parsedPick.type === 'spread') {
      detail.awayTeam = game.awayTeam;
      detail.homeTeam = game.homeTeam;
      detail.awayScore = game.awayScore;
      detail.homeScore = game.homeScore;
      detail.pickedTeam = parsedPick.team;
      detail.line = parsedPick.line;
    }
    
    results.total++;
    if (isCorrect) {
      results.correct++;
      results.rowResults.push(1);
    } else {
      results.incorrect++;
      results.rowResults.push(0);
    }
    results.rowDetails.push(detail);
  }
  
  return results;
}

/**
 * Parses a pick string into structured data
 * @param {string} pickText - Pick string like "Cards -5.5" or "Bucs/Falcons O 47.5" or "Steelers bengals under 45.5"
 * @return {Object} Parsed pick object or null if invalid
 */
function parsePick(pickText) {
  var text = pickText.toString().trim();
  var fuzzyMatches = [];
  
  // Check for Over/Under format with slash: "Team1/Team2 O 47.5" or "Team1/Team2 over 47.5"
  var ouMatch = text.match(/^(.+?)\/(.+?)\s+(O|U|over|under)\s+([\d.]+)$/i);
  if (ouMatch) {
    var team1Info = normalizeTeamName(ouMatch[1], true);
    var team2Info = normalizeTeamName(ouMatch[2], true);
    
    if (team1Info.matchType === 'fuzzy') fuzzyMatches.push(team1Info);
    if (team2Info.matchType === 'fuzzy') fuzzyMatches.push(team2Info);
    
    // Normalize direction to 'O' or 'U'
    var direction = ouMatch[3].toUpperCase();
    if (direction === 'OVER') direction = 'O';
    if (direction === 'UNDER') direction = 'U';
    
    return {
      type: 'overunder',
      team1: team1Info.abbr,
      team2: team2Info.abbr,
      direction: direction,  // 'O' or 'U'
      line: parseFloat(ouMatch[4]),
      fuzzyMatches: fuzzyMatches
    };
  }
  
  // Check for Over/Under format with space: "Team1 Team2 O 47.5" or "Team1 Team2 over 47.5"
  var ouSpaceMatch = text.match(/^(.+?)\s+(.+?)\s+(O|U|over|under)\s+([\d.]+)$/i);
  if (ouSpaceMatch) {
    var team1Info = normalizeTeamName(ouSpaceMatch[1], true);
    var team2Info = normalizeTeamName(ouSpaceMatch[2], true);
    
    if (team1Info.matchType === 'fuzzy') fuzzyMatches.push(team1Info);
    if (team2Info.matchType === 'fuzzy') fuzzyMatches.push(team2Info);
    
    // Normalize direction to 'O' or 'U'
    var direction = ouSpaceMatch[3].toUpperCase();
    if (direction === 'OVER') direction = 'O';
    if (direction === 'UNDER') direction = 'U';
    
    return {
      type: 'overunder',
      team1: team1Info.abbr,
      team2: team2Info.abbr,
      direction: direction,  // 'O' or 'U'
      line: parseFloat(ouSpaceMatch[4]),
      fuzzyMatches: fuzzyMatches
    };
  }
  
  // Check for Spread format: "Team -5.5" or "Team +5.5"
  var spreadMatch = text.match(/^(.+?)\s+([-+][\d.]+)$/);
  if (spreadMatch) {
    var teamInfo = normalizeTeamName(spreadMatch[1], true);
    if (teamInfo.matchType === 'fuzzy') fuzzyMatches.push(teamInfo);
    
    return {
      type: 'spread',
      team: teamInfo.abbr,
      line: parseFloat(spreadMatch[2]),
      fuzzyMatches: fuzzyMatches
    };
  }
  
  // Check for straight pick format: "Team" (no spread)
  if (text.length > 0) {
    var teamInfo = normalizeTeamName(text, true);
    if (teamInfo.matchType === 'fuzzy') fuzzyMatches.push(teamInfo);
    
    return {
      type: 'spread',
      team: teamInfo.abbr,
      line: 0,  // Straight pick
      fuzzyMatches: fuzzyMatches
    };
  }
  
  return null;
}

// ===================================================================
// GAME MATCHING AND EVALUATION
// ===================================================================

/**
 * Finds the game matching the parsed pick (very lenient matching)
 * @param {Object} parsedPick - Parsed pick object
 * @param {Object} gamesMap - Games lookup map
 * @return {Object} Game object or null if not found
 */
function findGame(parsedPick, gamesMap) {
  if (parsedPick.type === 'overunder') {
    // Look for game with both teams
    var team1 = parsedPick.team1;
    var team2 = parsedPick.team2;
    
    // Try all possible combinations
    var gameKey1 = team1 + '@' + team2;
    var gameKey2 = team2 + '@' + team1;
    
    var game = gamesMap[gameKey1] || gamesMap[gameKey2];
    
    // If direct match fails, try to find by checking if both teams are in any game
    if (!game) {
      for (var key in gamesMap) {
        var g = gamesMap[key];
        if (g && g.awayTeam && g.homeTeam) {
          if ((g.awayTeam === team1 && g.homeTeam === team2) ||
              (g.awayTeam === team2 && g.homeTeam === team1)) {
            game = g;
            break;
          }
        }
      }
    }
    
    if (game) {
      Logger.log('Found game: ' + game.awayTeam + ' @ ' + game.homeTeam + 
                 ' (' + game.awayScore + '-' + game.homeScore + ')');
    } else {
      Logger.log('Game not found for: ' + team1 + ' vs ' + team2);
    }
    
    return game || null;
  } else {
    // Spread pick - find game with this team
    var team = parsedPick.team;
    var games = gamesMap[team];
    
    if (games && games.length > 0) {
      // Filter to only completed games
      var completedGames = [];
      for (var i = 0; i < games.length; i++) {
        if (games[i].completed) {
          completedGames.push(games[i]);
        }
      }
      
      if (completedGames.length > 0) {
        var game = completedGames[0];
        Logger.log('Found game for ' + team + ': ' + game.awayTeam + ' @ ' + game.homeTeam + 
                   ' (' + game.awayScore + '-' + game.homeScore + ')');
        return game;
      } else {
        Logger.log('No completed games found for team: ' + team);
        return games[0]; // Return first game even if not completed (will be marked pending later)
      }
    }
    
    Logger.log('No games found for team: ' + team);
    return null;
  }
}

/**
 * Evaluates if a pick was correct based on the game result
 * @param {Object} parsedPick - Parsed pick object
 * @param {Object} game - Game result object
 * @return {boolean} True if pick was correct
 */
function evaluatePick(parsedPick, game) {
  if (parsedPick.type === 'overunder') {
    // Over/Under pick
    var totalPoints = game.totalPoints;
    var line = parsedPick.line;
    
    Logger.log('O/U Evaluation: ' + parsedPick.team1 + '/' + parsedPick.team2 + ' ' + 
               parsedPick.direction + ' ' + line + ' | Actual: ' + totalPoints);
    
    if (parsedPick.direction === 'O') {
      return totalPoints > line;
    } else {
      return totalPoints < line;
    }
  } else {
    // Spread pick
    var team = parsedPick.team;
    var line = parsedPick.line;
    
    var isHomeTeam = (team === game.homeTeam);
    var teamScore = isHomeTeam ? game.homeScore : game.awayScore;
    var opponentScore = isHomeTeam ? game.awayScore : game.homeScore;
    
    // Calculate the actual point difference
    var actualMargin = teamScore - opponentScore;
    
    // Add the line to the actual margin
    // Example 1: Team -5.5 (favorite by 5.5), wins by 7 → actualMargin=7, line=-5.5, result=1.5 (COVERED)
    // Example 2: Team -5.5 (favorite by 5.5), wins by 3 → actualMargin=3, line=-5.5, result=-2.5 (DIDN'T COVER)
    // Example 3: Team +5.5 (underdog gets 5.5), loses by 3 → actualMargin=-3, line=+5.5, result=2.5 (COVERED)
    var result = actualMargin + line;
    
    Logger.log('Spread Evaluation: ' + team + ' ' + (line > 0 ? '+' : '') + line + 
               ' | Score: ' + teamScore + '-' + opponentScore + 
               ' | Margin: ' + actualMargin + ' | Result: ' + result + 
               ' | Covered: ' + (result > 0));
    
    return result > 0;
  }
}

// ===================================================================
// USER INTERFACE AND RESULT DISPLAY
// ===================================================================

/**
 * Shows a preview of changes and asks user to confirm
 * @param {Ui} ui - Google Sheets UI object
 * @param {Sheet} sheet - Picks sheet
 * @param {Array} picksData - Original picks data
 * @param {Object} results - Validation results
 * @param {string} dateRange - Date range of score data
 * @return {boolean} True if user confirmed, false if cancelled
 */
function showPreviewAndConfirm(ui, sheet, picksData, results, dateRange) {
  // Count unmatched picks
  var invalidCount = 0;
  var notFoundCount = 0;
  for (var i = 0; i < results.rowResults.length; i++) {
    if (results.rowResults[i] === 'invalid') invalidCount++;
    if (results.rowResults[i] === 'notfound') notFoundCount++;
  }
  
  // Build preview message
  var preview = '=== CHANGES PREVIEW ===\n\n';
  if (dateRange) {
    preview += 'Score data available for games: ' + dateRange + '\n';
    preview += 'Only matching week picks will be updated.\n\n';
  }
  preview += 'Total picks to update: ' + results.total + '\n';
  preview += 'Correct (1): ' + results.correct + '\n';
  preview += 'Incorrect (0): ' + results.incorrect + '\n';
  preview += 'Pending: ' + results.pending + '\n';
  
  if (invalidCount > 0 || notFoundCount > 0) {
    preview += '\n⚠️ ISSUES FOUND:\n';
    if (invalidCount > 0) {
      preview += '• Invalid format: ' + invalidCount + ' (will be highlighted YELLOW)\n';
    }
    if (notFoundCount > 0) {
      preview += '• Game not found: ' + notFoundCount + ' (will be highlighted ORANGE)\n';
    }
  }
  
  preview += '\n';
  
  // Show all changes
  preview += 'All changes:\n';
  
  for (var i = 0; i < results.rowResults.length; i++) {
    var result = results.rowResults[i];
    if (result !== null && result !== 'pending') {
      var rowNum = i + 2; // +2 for 1-based and header
      var detail = results.rowDetails[i];
      var pickText = '';
      var displayResult = '';
      
      // Get pick text from detail or fallback to picksData
      // Note: results.rowResults[i] corresponds to picksData[i+1] (since processPicks skips header at index 0)
      if (detail && detail.pickText) {
        pickText = detail.pickText;
      } else if (picksData[i + 1] && picksData[i + 1][1]) {
        pickText = picksData[i + 1][1];
      }
      
      if (result === 'invalid') {
        displayResult = '? (invalid format)';
      } else if (result === 'notfound') {
        displayResult = '? (game not found)';
      } else if (detail) {
        // Show detailed result with game outcome
        if (detail.type === 'overunder') {
          displayResult = detail.actualTotal + ' (total) ' + (detail.isCorrect ? '✓' : '✗') + ' = ' + result;
        } else if (detail.type === 'spread') {
          displayResult = detail.awayTeam + ' ' + detail.awayScore + ', ' + 
                         detail.homeTeam + ' ' + detail.homeScore + ' ' + 
                         (detail.isCorrect ? '✓' : '✗') + ' = ' + result;
        } else {
          displayResult = result;
        }
        
        // Add fuzzy match indicator
        if (detail.fuzzyMatches && detail.fuzzyMatches.length > 0) {
          displayResult += ' 🔍';  // Add search icon for fuzzy matches
        }
      } else {
        displayResult = result;
      }
      
      preview += 'Row ' + rowNum + ': "' + pickText + '" → ' + displayResult;
      
      // Add fuzzy match details below
      if (detail && detail.fuzzyMatches && detail.fuzzyMatches.length > 0) {
        preview += '\n    ⚡ Fuzzy matched: ';
        var matchDescriptions = [];
        for (var j = 0; j < detail.fuzzyMatches.length; j++) {
          var match = detail.fuzzyMatches[j];
          matchDescriptions.push('"' + match.originalInput + '" → "' + match.matchedKey + '"');
        }
        preview += matchDescriptions.join(', ');
      }
      
      preview += '\n';
    }
  }
  
  preview += '\n\nDo you want to commit these changes to the sheet?';
  if (invalidCount > 0 || notFoundCount > 0) {
    preview += '\n(Highlighted rows need correction)';
  }
  
  // Show confirmation dialog
  var response = ui.alert(
    'Confirm Changes',
    preview,
    ui.ButtonSet.YES_NO
  );
  
  return response === ui.Button.YES;
}

/**
 * Writes results to column C of Picks sheet
 * @param {Sheet} sheet - Picks sheet
 * @param {Object} results - Results object with rowResults array
 */
function writeResults(sheet, results) {
  // Column C is the 3rd column (index 3)
  var RESULTS_COLUMN = 3;
  // Column F is the 6th column (index 6) for error messages
  var ERROR_COLUMN = 6;
  
  for (var i = 0; i < results.rowResults.length; i++) {
    var result = results.rowResults[i];
    var rowNum = i + 2;  // +2 because array is 0-based and we skip header
    
    if (result === null) {
      // Skip rows that don't have picks (headers, empty rows, weeks without score data)
      continue;
    }
    
    var resultCell = sheet.getRange(rowNum, RESULTS_COLUMN);
    var errorCell = sheet.getRange(rowNum, ERROR_COLUMN);
    
    if (result === 'pending') {
      // Pending game - just clear the value, preserve formatting
      resultCell.setValue('');
      errorCell.setValue('');
      errorCell.setBackground(null);
    } else if (result === 'invalid') {
      // Invalid pick format - highlight column F only, don't touch column C
      resultCell.setValue('');
      errorCell.setValue('Unable to be matched via script (invalid format)');
      errorCell.setBackground('#fff3cd');  // Light yellow
      errorCell.setFontColor('#856404');
      errorCell.setFontSize(9);
      errorCell.setWrap(true);
      Logger.log('Row ' + rowNum + ' marked as INVALID FORMAT');
    } else if (result === 'notfound') {
      // Game not found - highlight column F only, don't touch column C
      resultCell.setValue('');
      errorCell.setValue('Unable to be matched via script (game not found)');
      errorCell.setBackground('#ffe0b2');  // Light orange
      errorCell.setFontColor('#d84315');
      errorCell.setFontSize(9);
      errorCell.setWrap(true);
      Logger.log('Row ' + rowNum + ' marked as GAME NOT FOUND');
    } else {
      // Normal result: 1 or 0 - just set value, preserve existing formatting
      resultCell.setValue(result);
      
      // Clear error message in column F - restore to defaults
      errorCell.setValue('');
      errorCell.setBackground(null);
      errorCell.setFontColor('#000000');
      errorCell.setFontSize(10);
    }
  }
  
  Logger.log('Pick results written to sheet');
}
