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
 * Menu item: Fetch current week's spreads from ESPN
 */
function fetchSpreads() {
  try {
    var spreads = getSpreadsFromESPN();
    writeSpreadsToSheet(spreads);
    SpreadsheetApp.getUi().alert('Spreads fetched successfully!');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error fetching spreads: ' + error.message);
  }
}

/**
 * Menu item: Fetch current week's final scores from ESPN
 */
function fetchScores() {
  try {
    var scores = getScoresFromESPN();
    writeScoresToSheet(scores);
    SpreadsheetApp.getUi().alert('Scores fetched successfully!');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error fetching scores: ' + error.message);
  }
}

/**
 * Menu item: Check picks against actual results
 */
function checkPicks() {
  try {
    var results = validatePicks();
    SpreadsheetApp.getUi().alert(
      'Picks checked!\n\n' +
      'Total Picks: ' + results.total + '\n' +
      'Correct: ' + results.correct + '\n' +
      'Incorrect: ' + results.incorrect + '\n' +
      'Pending: ' + results.pending
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error checking picks: ' + error.message);
  }
}
