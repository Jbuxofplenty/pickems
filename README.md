# NFL Pick'Ems - Automated Pick Validation System

## Overview

A Google Apps Script application that automates the validation of NFL picks against actual game results. The system fetches live data from ESPN's API, intelligently matches user picks with game outcomes, and provides visual feedback directly in Google Sheets.

### Key Features

- **Automatic Data Fetching**: Pulls spreads and scores from ESPN API
- **Smart Pick Validation**: Evaluates spread picks and over/under picks
- **Lenient Team Matching**: Handles typos, abbreviations, nicknames, and various team name formats
- **Week-Based Processing**: Automatically matches picks to correct game week based on dates
- **Visual Feedback**: Highlights incorrect matches and provides detailed previews
- **User Confirmation**: Shows all changes before applying them

## Table of Contents

- [File Structure](#file-structure)
- [Setup Instructions](#setup-instructions)
- [How It Works](#how-it-works)
- [Usage Guide](#usage-guide)
- [Pick Formats](#pick-formats)
- [Sheet Structure](#sheet-structure)
- [Architecture](#architecture)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## File Structure

```text
Code.js           - Menu setup and entry points for all operations
SpreadsAPI.js     - Fetches betting spreads and over/under lines from ESPN
ScoresAPI.js      - Fetches final game scores and status from ESPN
PicksChecker.js   - Core validation engine for picks
Utilities.js      - Shared helper functions (date, team normalization, etc.)
```

### Code.js
Main entry point that creates the "NFL Data" menu with three options:
- Fetch Spreads (current week only)
- Fetch Scores (with optional date input)
- Check Picks (validates and writes results)

### SpreadsAPI.js
Handles fetching betting lines from ESPN's scoreboard API. Note: ESPN only provides spreads for current/upcoming games, not historical data.

### ScoresAPI.js
Fetches game scores including final results, live scores, and scheduled games. Supports fetching by week (enter any date in that week to get all games).

### PicksChecker.js
The heart of the system. Handles:
- Building game maps from scores and spreads data
- Parsing user picks (spread and over/under formats)
- Matching picks to games with lenient team name recognition
- Evaluating pick correctness based on final scores
- Generating user-friendly previews with detailed results

### Utilities.js
Shared utilities including:
- NFL week calculation from dates
- Team name normalization (handles 100+ variations)
- Date formatting
- Spreadsheet helpers

## Setup Instructions

### 1. Create Google Sheets Spreadsheet

1. Open [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it (e.g., "NFL Pick'Ems 2025")

### 2. Add Apps Script Code

1. Go to **Extensions > Apps Script**
2. Delete the default `Code.gs` file
3. Create the following files (use **File > New > Script** for each):
   - `Code.js`
   - `SpreadsAPI.js`
   - `ScoresAPI.js`
   - `PicksChecker.js`
   - `Utilities.js`
4. Copy the code from each corresponding file in this repository
5. Click **Save** (💾 icon)

### 3. First Run Authorization

1. In the Apps Script editor, select `onOpen` from the function dropdown
2. Click **Run** (▶️ icon)
3. Click **Review permissions**
4. Select your Google account
5. Click **Advanced** → **Go to [Your Project Name] (unsafe)**
6. Click **Allow**

### 4. Set Up Your Picks Sheet

The first sheet in your spreadsheet will automatically be used for picks. Set it up with these columns:

| Column | Header | Description |
|--------|--------|-------------|
| A | Player/Week | Player name or "Week X" header |
| B | Picks | The actual pick text |
| C | Results | Auto-filled by script (1=correct, 0=incorrect) |
| D | Standings | Optional standings/scores |
| E | Date | Thursday start date for each week (MM/DD/YYYY) |
| F | Notes | Used by script for error messages |

### 5. Refresh and Use

1. Close and reopen the spreadsheet
2. You should see a new **"NFL Data"** menu in the menu bar
3. Ready to use!

## How It Works

### Data Flow

```
1. User runs "Fetch Spreads"
   └─> ESPN API → Parse spread data → Write to "Spreads" sheet

2. User runs "Fetch Scores" (with optional date)
   └─> ESPN API → Parse score data → Write to "Scores" sheet
       └─> Highlight completed games in green

3. User runs "Check Picks"
   └─> Read Picks sheet
   └─> Build games map from Scores + Spreads
   └─> For each pick:
       ├─> Parse pick format
       ├─> Normalize team names
       ├─> Match to game
       └─> Evaluate correctness
   └─> Show preview with all changes
   └─> If confirmed: Write results to sheet
```

### Week Matching Logic

The system intelligently determines which picks to validate:

1. Reads "Week X" header from Column A
2. Reads Thursday start date from Column E  
3. Calculates week range (Thursday through next Wednesday)
4. Checks if any games in "Scores" sheet fall within that range
5. Only processes picks for weeks with matching score data
6. Skips picks for weeks without scores (e.g., future weeks)

### Team Name Matching

Very lenient matching handles:
- Full names: "Cardinals", "Pittsburgh Steelers"
- Abbreviations: "ARI", "PIT", "SF"
- Nicknames: "Cards", "Niners", "Steelers"
- City names: "Pittsburgh", "San Francisco"
- Common typos and variations
- Case insensitive
- Partial matches

Example: "steeler", "Steelers", "steeler", "PIT", "Pittsburgh" all match to "PIT"

## Usage Guide

### Fetching Spreads

1. Click **NFL Data > Fetch Spreads**
2. System fetches current week spreads from ESPN
3. Data written to "Spreads" sheet
4. Alert shows number of games found

**Note**: ESPN only provides spreads for upcoming games. Historical spreads are not available.

### Fetching Scores

1. Click **NFL Data > Fetch Scores**
2. Dialog appears asking for optional date:
   - Leave blank for current week
   - Enter date in format `YYYYMMDD` or `YYYY-MM-DD` (e.g., `20251017` or `2025-10-17`)
   - System fetches ALL games from that week (Thursday-Wednesday)
3. Data written to "Scores" sheet with completed games highlighted
4. Alert shows number of games found

**Tip**: Run this multiple times during game day to update scores in real-time.

### Checking Picks

1. Click **NFL Data > Check Picks**
2. System processes picks and shows preview dialog with:
   - Date range of available score data
   - Count of correct/incorrect/pending picks
   - Warning about any unmatched picks
   - Detailed list of ALL changes showing:
     * For over/under: actual total and whether it went over/under
     * For spreads: final scores and whether spread was covered
3. Review the changes
4. Click **Yes** to apply or **No** to cancel
5. If applied:
   - Results written to Column C (1 or 0)
   - Unmatched picks highlighted in Column F with explanation
6. Final summary shows what was written

## Pick Formats

The system supports multiple pick formats:

### Spread Picks

Format: `Team Spread` or just `Team`

Examples:
- `Cardinals -5.5` (Cardinals favored by 5.5 points)
- `Bills +3` (Bills getting 3 points)
- `Chiefs` (straight pick, no spread)

### Over/Under Picks

Format: `Team1/Team2 O/U Line` or `Team1 Team2 O/U Line`

Examples:
- `Rams/Jags O 44.5` (picking over 44.5 total points)
- `Steelers bengals U 45.5` (picking under 45.5 total points)
- `Eagles/Giants O 47` (picking over 47 total points)

**Note**: Team names can be in any order and use various formats (abbreviations, full names, nicknames).

## Sheet Structure

### Picks Sheet (Your Main Sheet)

Suggested layout:

```text
Row 1: Headers
Row 2+: Week header rows and pick rows

Example:
┌─────────┬──────────────────────┬─────────┬───────────┬────────────┐
│    A    │          B           │    C    │     D     │     E      │
├─────────┼──────────────────────┼─────────┼───────────┼────────────┤
│ Week 7  │       Picks          │ Results │ Standings │ 10/17/2025 │
├─────────┼──────────────────────┼─────────┼───────────┼────────────┤
│ Alice   │                      │         │    45     │            │
│         │ Cardinals -5.5       │    1    │           │            │
│         │ Bills +3             │    0    │           │            │
│         │ Chiefs -7            │    1    │           │            │
│         │ Rams/Jags O 44.5     │    0    │           │            │
├─────────┼──────────────────────┼─────────┼───────────┼────────────┤
│ Bob     │                      │         │    42     │            │
│         │ Vikings -2.5         │    1    │           │            │
│         │ Eagles +4.5          │    0    │           │            │
```

### Scores Sheet (Auto-Generated)

Created when you run "Fetch Scores". Contains:

- Week, Year, Game ID, Date
- Away Team, Away Team Name, Away Score
- Home Team, Home Team Name, Home Score
- Winner, Completed, Status

### Spreads Sheet (Auto-Generated)

Created when you run "Fetch Spreads". Contains:

- Week, Year, Game ID, Date
- Away Team, Away Team Name
- Home Team, Home Team Name
- Spread, Over/Under, Status

## Architecture

### Design Principles

1. **Separation of Concerns**: Each file has a specific responsibility
2. **DRY (Don't Repeat Yourself)**: Shared utilities in `Utilities.js`
3. **User-Centric**: Always show previews, never auto-commit without confirmation
4. **Lenient Matching**: Forgive user typos and format variations
5. **Informative Feedback**: Detailed error messages and highlights

### Key Algorithms

#### Game Matching (`findGame` in PicksChecker.js)

For over/under picks:
1. Try direct key lookups (`team1@team2`, `team2@team1`)
2. Fallback to iterating all games looking for both teams

For spread picks:
1. Look up team in games map
2. Filter to completed games only
3. Return first match

#### Pick Evaluation (`evaluatePick` in PicksChecker.js)

For over/under:
- Compare actual total points vs line
- Over: correct if `totalPoints > line`
- Under: correct if `totalPoints < line`

For spreads:
- Calculate actual margin: `teamScore - opponentScore`
- Apply spread to margin: `result = actualMargin + spread`
- Covered if `result > 0`

Example: Team favored by -5.5 wins by 7
- Actual margin: +7
- Result: 7 + (-5.5) = 1.5
- Result > 0 ✓ Pick is correct (covered the spread)

### Error Handling

The system gracefully handles:
- Missing sheets (creates them as needed)
- Invalid pick formats (highlights and explains)
- Unmatched team names (suggests correction)
- API failures (shows error message)
- Missing score data (skips those weeks)

## Testing

This project includes comprehensive unit tests that run locally and in CI/CD.

### Running Tests Locally

```bash
# Install dependencies (one time)
yarn install

# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage
```

### Test Coverage

- ✅ **66 Tests Passing**: All core functionality tested
- ✅ **Utilities**: Team normalization, date calculations, string utilities  
- ✅ **Pick Validation**: Parsing, matching, and evaluation logic
- ✅ **Edge Cases**: Handles typos, various formats, boundary conditions
- 🔄 **CI/CD**: Automated testing on every push via GitHub Actions

**Note**: Coverage metrics show 0% due to Google Apps Script's non-modular architecture requiring `eval()` for testing. Tests are comprehensive but coverage tracking is limited by GAS constraints.

### What's Tested

```javascript
✅ normalizeTeamName() - Handles 100+ team name variations
✅ parsePick() - Parses spread and over/under picks
✅ evaluatePick() - Correctly evaluates wins/losses
✅ findGame() - Matches picks to games
✅ getWeekFromDate() - NFL week calculations
✅ And more...
```

### GitHub Actions

Tests run automatically on:
- Every push to `main` or `develop` branches  
- Every pull request

See [TESTING.md](TESTING.md) for complete testing documentation.

## Troubleshooting

### No "NFL Data" Menu?

1. Refresh the spreadsheet (close and reopen)
2. Check that Apps Script code is saved
3. Run `onOpen` function manually from script editor
4. Check browser console for errors

### Picks Not Matching?

Check Column F for error messages:
- **"Unable to be matched via script (invalid format)"**: Pick format is wrong
  - Fix: Use correct format like `Team -5.5` or `Team1/Team2 O 45`
- **"Unable to be matched via script (game not found)"**: Team name not recognized
  - Fix: Try abbreviation (e.g., "PIT" instead of "Pittsburg")
  - Fix: Check spelling

### No Score Data for My Week?

1. Make sure you've run "Fetch Scores" recently
2. Verify the date in Column E matches the week you want
3. Check that games have been played (system only validates completed games)
4. Run "Fetch Scores" with a specific date to get that week's data

### ESPN API Not Responding?

- ESPN API may be temporarily down
- Wait a few minutes and try again
- Check internet connection
- Try different week if current week has issues

### Results Look Wrong?

1. Check the Scores sheet - are the scores correct?
2. Look at preview dialog - does it show the correct game matchup?
3. Verify spread/over-under line matches what you expected
4. Check if game was actually completed (vs postponed/cancelled)

### Clear Error Highlighting?

To remove error highlighting from Column F:
1. Fix the pick format in Column B
2. Run "Check Picks" again
3. System will clear highlight when pick matches successfully

## Tips and Best Practices

### Timing

- **Spreads**: Fetch early in week when lines are posted (Tuesday/Wednesday)
- **Scores**: Fetch Sunday evening or Monday morning after games complete
- **Checking**: Run multiple times - system only updates weeks with score data

### Pick Format

- Use consistent format across all picks for easier review
- Over/under picks: Use `/` separator for clarity (`Team1/Team2 O 45`)
- Spread picks: Include the sign (`-5.5` or `+3`)
- Keep it simple: abbreviations work great (`KC -7`)

### Data Management

- Don't delete Scores or Spreads sheets - they're needed for validation
- You can manually edit these sheets if ESPN data is wrong
- Keep historical data by duplicating sheets before fetching new week

### Testing

- Test with a few picks before doing full week
- Use the preview dialog to verify everything looks correct
- Start with current week where you know the outcomes

## Advanced Usage

### Multiple Seasons

Create separate spreadsheets for each season, or use different sheets within one spreadsheet. The system uses sheet names to organize data.

### Custom Scoring

Results are written as 1/0 in Column C. Use formulas in Column D to calculate custom scoring (e.g., `=SUM(C2:C5)` for total correct).

### Batch Processing

The system processes all picks at once. No need to run week-by-week.

### Historical Analysis

Keep Scores sheets from past weeks to build historical database. Combine with picks data for season-long tracking.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the code comments for technical details
3. Check ESPN API is functioning: http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard

## Development

### Local Development Setup



**Quick Setup** (Recommended):

```bash
# Clone the repository
git clone https://github.com/Jbuxofplenty/pickems.git
cd pickems

# Run automated setup (installs dependencies and runs tests)
./setup-tests.sh
```

**Manual Setup**:

```bash
# Clone the repository
git clone https://github.com/Jbuxofplenty/pickems.git
cd pickems

# Install dependencies
yarn install

# Run tests
yarn test

# Watch mode for development
yarn test:watch
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`yarn test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Future Enhancements

Potential improvements:
- Support for player prop bets
- Automated weekly email summaries
- Integration with other sportsbooks
- Historical trend analysis
- Multiplayer leaderboards
- Mobile app integration

---

**Enjoy your automated NFL pick validation!** 🏈
