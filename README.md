# NFL Pick'Ems - Spreads & Scores Setup Guide

## Overview

Simple Google Apps Script application for fetching NFL spreads, scores, and validating picks.

## File Structure

```
Code.js           - Entry point, creates menu and handles UI
SpreadsAPI.js     - Fetches betting spreads from ESPN
ScoresAPI.js      - Fetches final game scores from ESPN
PicksChecker.js   - Validates picks against results
Utilities.js      - Helper functions
```

## Setup Instructions

### 1. Create Google Sheets File

1. Open Google Sheets and create a new spreadsheet
2. Go to Extensions > Apps Script
3. Delete the default `Code.gs` file
4. Create new files with the exact names and copy code from each file:
   - Code.js
   - SpreadsAPI.js
   - ScoresAPI.js
   - PicksChecker.js
   - Utilities.js

### 2. Configure Sheets

#### Create a "Picks" Sheet

This is where you'll manually enter picks to validate.

Required columns:

- **Column A: Player** - Name of person making pick
- **Column B: Game Identifier** - Either Game ID or matchup (e.g., "DEN@KC")
- **Column C: Pick** - Team abbreviation they picked to win (e.g., "KC")

Example:

```
Player      | Game Identifier | Pick
John Doe    | DEN@KC         | KC
Jane Smith  | LAC@LV         | LAC
```

### 3. Usage

After setup, you'll see an "NFL Data" menu in your spreadsheet with these options:

#### Fetch Spreads

- Pulls current week's betting lines from ESPN
- Creates/updates "Spreads" sheet with:
  - Week, Year, Game ID
  - Teams and matchup details
  - Spread and Over/Under lines
  - Game status

#### Fetch Scores

- Pulls current week's game scores from ESPN
- Creates/updates "Scores" sheet with:
  - Week, Year, Game ID
  - Teams and scores
  - Winner (determined by higher score)
  - Completion status
- Completed games are highlighted in green

#### Check Picks

- Validates picks from "Picks" sheet against "Scores" sheet
- Adds "Result" column to "Picks" sheet showing:
  - **CORRECT** (green) - Pick matched winner
  - **INCORRECT** (red) - Pick didn't match winner
  - **PENDING** (yellow) - Game not completed yet
  - **GAME NOT FOUND** (gray) - No matching game in scores
- Shows summary alert with totals

## How It Works

### Data Flow

1. **Fetch Spreads** → Retrieves betting lines → Writes to "Spreads" sheet
2. **Fetch Scores** → Retrieves game results → Writes to "Scores" sheet  
3. **Check Picks** → Reads "Picks" sheet → Compares with "Scores" → Updates results

### API Source

All data comes from ESPN's public API:

```
http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
```

### Matching Logic

Picks can be matched using either:

- **Game ID** - Unique ESPN game identifier
- **Matchup** - Team abbreviations in format "AWAY@HOME" (e.g., "DEN@KC")

## Tips

1. **Timing**
   - Fetch spreads early in the week when lines are posted
   - Fetch scores during/after games complete
   - Check picks after all games finish

2. **Game Identifiers**
   - Use matchup format (AWAY@HOME) for simplicity
   - Or use Game ID from Spreads sheet for precision

3. **Team Abbreviations**
   - Use official NFL abbreviations (KC, LAC, DEN, etc.)
   - Must match exactly with ESPN data

4. **Refresh Data**
   - Run "Fetch Scores" multiple times during game day to update
   - Previously completed games stay marked as complete

## Troubleshooting

**No menu appearing?**

- Reload the spreadsheet
- Check that `onOpen()` function exists in Code.js

**Picks not validating?**

- Ensure team abbreviations match exactly
- Check that "Scores" sheet has data (run Fetch Scores first)
- Verify Game Identifier format in Picks sheet

**API errors?**

- ESPN API may be temporarily unavailable
- Wait a few minutes and try again
- Check internet connection

## Future Enhancements

- Support for specific week selection
- Historical data tracking
- Automated scheduling
- More detailed statistics
- Spread-based pick validation
