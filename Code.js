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
    .addItem('Fetch Scores + Check Picks', 'fetchScoresAndCheckPicks')
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
      'Enter date or leave blank for current week:',
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
    var errorMsg = error.message;
    // Add helpful format info if it's a date format error
    if (errorMsg.indexOf('Invalid date format') !== -1) {
      errorMsg += '\n\nAccepted formats:\n• MM/DD/YYYY (e.g., 10/09/2025)\n• YYYYMMDD (e.g., 20251009)\n• YYYY-MM-DD (e.g., 2025-10-09)';
    }
    SpreadsheetApp.getUi().alert('Error fetching scores: ' + errorMsg);
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

/**
 * Menu item: Fetch scores and then check picks
 * Combines the two actions for convenience
 */
function fetchScoresAndCheckPicks() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    // Step 1: Prompt for date and fetch scores
    var response = ui.prompt(
      'Fetch Scores + Check Picks',
      'Enter date or leave blank for current week:',
      ui.ButtonSet.OK_CANCEL
    );
    
    // Check if user clicked OK
    if (response.getSelectedButton() !== ui.Button.OK) {
      return; // User cancelled
    }
    
    // Get the date string (will be empty string if left blank)
    var dateString = response.getResponseText().trim();
    
    // Fetch scores
    var scores = getScoresFromESPN(dateString || undefined);
    writeScoresToSheet(scores);
    
    // Step 2: Automatically check picks
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var firstSheet = ss.getSheets()[0];
    var sheetName = firstSheet.getName();
    
    var results = validatePicks();
    
    // Step 3: Show combined results
    var dateMsg = dateString ? ' for date: ' + dateString : ' for current week';
    
    if (results.committed) {
      ui.alert(
        '✓ Scores Fetched & Picks Checked',
        'Scores fetched successfully' + dateMsg + '!\n' +
        'Games found: ' + scores.length + '\n\n' +
        'Sheet checked: "' + sheetName + '"\n' +
        'Total Picks: ' + results.total + '\n' +
        'Correct: ' + results.correct + '\n' +
        'Incorrect: ' + results.incorrect + '\n' +
        'Pending: ' + results.pending + '\n\n' +
        'Changes have been written to the sheet.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Scores Fetched - Changes Cancelled',
        'Scores fetched successfully' + dateMsg + '!\n' +
        'Games found: ' + scores.length + '\n\n' +
        'Sheet: "' + sheetName + '"\n' +
        'No pick changes were made.\n\n' +
        'Summary:\n' +
        'Total Picks: ' + results.total + '\n' +
        'Correct: ' + results.correct + '\n' +
        'Incorrect: ' + results.incorrect + '\n' +
        'Pending: ' + results.pending,
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    var errorMsg = error.message;
    // Add helpful format info if it's a date format error
    if (errorMsg.indexOf('Invalid date format') !== -1) {
      errorMsg += '\n\nAccepted formats:\n• MM/DD/YYYY (e.g., 10/09/2025)\n• YYYYMMDD (e.g., 20251009)\n• YYYY-MM-DD (e.g., 2025-10-09)';
    }
    SpreadsheetApp.getUi().alert('Error: ' + errorMsg);
  }
}
