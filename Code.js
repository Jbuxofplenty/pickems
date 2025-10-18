/**
 * Code.js - Entry point for NFL Pick'Ems Spreads & Scores
 * Creates menu and initializes the application
 */

/**
 * Runs when spreadsheet is opened - creates custom menu
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  ui.createMenu('NFL Data')
    .addItem('Fetch Spreads', 'fetchSpreads')
    .addItem('Fetch Scores', 'fetchScores')
    .addSeparator()
    .addItem('Check Picks', 'checkPicks')
    .addToUi();
}

/**
 * Menu item: Fetch spreads from ESPN for current week
 * Spreads are only available for current/upcoming games
 */
function fetchSpreads() {
  try {
    var spreads = getSpreadsFromESPN();
    writeSpreadsToSheet(spreads);
    
    var ui = SpreadsheetApp.getUi();
    ui.alert('Spreads fetched successfully for current week!\n\nGames found: ' + spreads.length);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error fetching spreads: ' + error.message);
  }
}

/**
 * Menu item: Fetch scores from ESPN
 * Prompts user for optional date, uses current week if blank
 */
function fetchScores() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    // Prompt user for date
    var response = ui.prompt(
      'Fetch Scores',
      'Enter date (YYYYMMDD or YYYY-MM-DD) or leave blank for current week:\n\nExample: 20250904 or 2025-09-04',
      ui.ButtonSet.OK_CANCEL
    );
    
    // Check if user clicked OK
    if (response.getSelectedButton() !== ui.Button.OK) {
      return; // User cancelled
    }
    
    // Get the date string (will be empty string if left blank)
    var dateString = response.getResponseText().trim();
    
    var scores = getScoresFromESPN(dateString || undefined);
    writeScoresToSheet(scores);
    
    var dateMsg = dateString ? ' for date: ' + dateString : ' for current week';
    ui.alert('Scores fetched successfully' + dateMsg + '!\n\nGames found: ' + scores.length);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error fetching scores: ' + error.message);
  }
}

/**
 * Menu item: Check picks against actual results
 * Automatically uses the first sheet in the spreadsheet
 */
function checkPicks() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    // Automatically use first sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var firstSheet = ss.getSheets()[0];
    var sheetName = firstSheet.getName();
    
    // Run validation without prompting
    var results = validatePicks();
    
    // Show different message based on whether changes were committed
    if (results.committed) {
      ui.alert(
        '✓ Results Written',
        'Sheet checked: "' + sheetName + '"\n\n' +
        'Total Picks: ' + results.total + '\n' +
        'Correct: ' + results.correct + '\n' +
        'Incorrect: ' + results.incorrect + '\n' +
        'Pending: ' + results.pending + '\n\n' +
        'Changes have been written to the sheet.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Changes Cancelled',
        'Sheet: "' + sheetName + '"\n\n' +
        'No changes were made.\n\n' +
        'Summary:\n' +
        'Total Picks: ' + results.total + '\n' +
        'Correct: ' + results.correct + '\n' +
        'Incorrect: ' + results.incorrect + '\n' +
        'Pending: ' + results.pending,
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error checking picks: ' + error.message);
  }
}
