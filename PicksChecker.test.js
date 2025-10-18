/**
 * PicksChecker.test.js - Unit tests for picks validation logic
 */

// Load mocks before importing code
require('./__mocks__/gas-mocks');

const fs = require('fs');
const path = require('path');

// Load dependencies first
const utilitiesCode = fs.readFileSync(path.join(__dirname, 'Utilities.js'), 'utf8');
eval(utilitiesCode);

// Load PicksChecker code
const picksCheckerCode = fs.readFileSync(path.join(__dirname, 'PicksChecker.js'), 'utf8');
eval(picksCheckerCode);

describe('PicksChecker', () => {
  
  describe('parsePick', () => {
    describe('Over/Under picks with slash', () => {
      test('should parse over pick with slash separator', () => {
        const result = parsePick('Rams/Jags O 44.5');
        expect(result).toEqual({
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX',
          direction: 'O',
          line: 44.5
        });
      });

      test('should parse under pick with slash separator', () => {
        const result = parsePick('Steelers/Bengals U 45.5');
        expect(result).toEqual({
          type: 'overunder',
          team1: 'PIT',
          team2: 'CIN',
          direction: 'U',
          line: 45.5
        });
      });

      test('should handle integer line', () => {
        const result = parsePick('Eagles/Giants O 47');
        expect(result).toEqual({
          type: 'overunder',
          team1: 'PHI',
          team2: 'NYG',
          direction: 'O',
          line: 47
        });
      });
    });

    describe('Over/Under picks with space', () => {
      test('should parse over pick with space separator', () => {
        const result = parsePick('Rams Jags O 44.5');
        expect(result).toEqual({
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX',
          direction: 'O',
          line: 44.5
        });
      });

      test('should parse under pick with space separator', () => {
        const result = parsePick('Steelers bengals U 45.5');
        expect(result).toEqual({
          type: 'overunder',
          team1: 'PIT',
          team2: 'CIN',
          direction: 'U',
          line: 45.5
        });
      });
    });

    describe('Spread picks', () => {
      test('should parse negative spread', () => {
        const result = parsePick('Cardinals -5.5');
        expect(result).toEqual({
          type: 'spread',
          team: 'ARI',
          line: -5.5
        });
      });

      test('should parse positive spread', () => {
        const result = parsePick('Bills +3');
        expect(result).toEqual({
          type: 'spread',
          team: 'BUF',
          line: 3
        });
      });

      test('should parse integer spread', () => {
        const result = parsePick('Chiefs -7');
        expect(result).toEqual({
          type: 'spread',
          team: 'KC',
          line: -7
        });
      });

      test('should handle decimal spread', () => {
        const result = parsePick('Vikings -2.5');
        expect(result).toEqual({
          type: 'spread',
          team: 'MIN',
          line: -2.5
        });
      });
    });

    describe('Straight picks (no spread)', () => {
      test('should parse straight pick', () => {
        const result = parsePick('Chiefs');
        expect(result).toEqual({
          type: 'spread',
          team: 'KC',
          line: 0
        });
      });

      test('should handle full team name', () => {
        const result = parsePick('Pittsburgh Steelers');
        expect(result).toEqual({
          type: 'spread',
          team: 'PIT',
          line: 0
        });
      });
    });

    describe('Invalid formats', () => {
      test('should return null for empty string', () => {
        expect(parsePick('')).toBeNull();
      });

      test('should return null for whitespace only', () => {
        expect(parsePick('   ')).toBeNull();
      });
    });

    describe('Case insensitivity', () => {
      test('should handle lowercase O/U', () => {
        const resultO = parsePick('Rams/Jags o 44.5');
        const resultU = parsePick('Rams/Jags u 44.5');
        expect(resultO.direction).toBe('O');
        expect(resultU.direction).toBe('U');
      });
    });
  });

  describe('evaluatePick', () => {
    describe('Over/Under evaluation', () => {
      const game = {
        awayTeam: 'LAR',
        homeTeam: 'JAX',
        awayScore: 30,
        homeScore: 34,
        totalPoints: 64
      };

      test('should correctly evaluate OVER pick when total is above line', () => {
        const pick = {
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX',
          direction: 'O',
          line: 44.5
        };
        expect(evaluatePick(pick, game)).toBe(true);
      });

      test('should correctly evaluate OVER pick when total is below line', () => {
        const pick = {
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX',
          direction: 'O',
          line: 70
        };
        expect(evaluatePick(pick, game)).toBe(false);
      });

      test('should correctly evaluate UNDER pick when total is below line', () => {
        const pick = {
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX',
          direction: 'U',
          line: 70
        };
        expect(evaluatePick(pick, game)).toBe(true);
      });

      test('should correctly evaluate UNDER pick when total is above line', () => {
        const pick = {
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX',
          direction: 'U',
          line: 45.5
        };
        expect(evaluatePick(pick, game)).toBe(false);
      });

      test('should handle exact match (push) correctly', () => {
        const pick = {
          type: 'overunder',
          direction: 'O',
          line: 64 // Exact match
        };
        // Over requires > not >=, so this should be false
        expect(evaluatePick(pick, game)).toBe(false);
      });
    });

    describe('Spread evaluation', () => {
      test('should correctly evaluate favorite covering spread', () => {
        const game = {
          awayTeam: 'KC',
          homeTeam: 'DEN',
          awayScore: 31,
          homeScore: 24,
          totalPoints: 55
        };
        
        // KC -5.5, wins by 7, covers
        const pick = {
          type: 'spread',
          team: 'KC',
          line: -5.5
        };
        expect(evaluatePick(pick, game)).toBe(true);
      });

      test('should correctly evaluate favorite not covering spread', () => {
        const game = {
          awayTeam: 'KC',
          homeTeam: 'DEN',
          awayScore: 27,
          homeScore: 24,
          totalPoints: 51
        };
        
        // KC -5.5, wins by 3, doesn't cover
        const pick = {
          type: 'spread',
          team: 'KC',
          line: -5.5
        };
        expect(evaluatePick(pick, game)).toBe(false);
      });

      test('should correctly evaluate underdog covering spread', () => {
        const game = {
          awayTeam: 'KC',
          homeTeam: 'DEN',
          awayScore: 27,
          homeScore: 24,
          totalPoints: 51
        };
        
        // DEN +5.5, loses by 3, covers
        const pick = {
          type: 'spread',
          team: 'DEN',
          line: 5.5
        };
        expect(evaluatePick(pick, game)).toBe(true);
      });

      test('should correctly evaluate underdog not covering spread', () => {
        const game = {
          awayTeam: 'KC',
          homeTeam: 'DEN',
          awayScore: 31,
          homeScore: 24,
          totalPoints: 55
        };
        
        // DEN +5.5, loses by 7, doesn't cover
        const pick = {
          type: 'spread',
          team: 'DEN',
          line: 5.5
        };
        expect(evaluatePick(pick, game)).toBe(false);
      });

      test('should handle home team pick', () => {
        const game = {
          awayTeam: 'DEN',
          homeTeam: 'KC',
          awayScore: 20,
          homeScore: 27,
          totalPoints: 47
        };
        
        const pick = {
          type: 'spread',
          team: 'KC',
          line: -5.5
        };
        expect(evaluatePick(pick, game)).toBe(true);
      });

      test('should handle straight pick (line = 0)', () => {
        const game = {
          awayTeam: 'KC',
          homeTeam: 'DEN',
          awayScore: 27,
          homeScore: 24,
          totalPoints: 51
        };
        
        const pick = {
          type: 'spread',
          team: 'KC',
          line: 0
        };
        expect(evaluatePick(pick, game)).toBe(true);
      });
    });
  });

  describe('findGame', () => {
    const gamesMap = {
      'LAR@JAX': {
        awayTeam: 'LAR',
        homeTeam: 'JAX',
        awayScore: 30,
        homeScore: 34,
        completed: true
      },
      'KC@DEN': {
        awayTeam: 'KC',
        homeTeam: 'DEN',
        awayScore: 27,
        homeScore: 24,
        completed: true
      },
      'LAR': [{
        awayTeam: 'LAR',
        homeTeam: 'JAX',
        awayScore: 30,
        homeScore: 34,
        completed: true
      }],
      'JAX': [{
        awayTeam: 'LAR',
        homeTeam: 'JAX',
        awayScore: 30,
        homeScore: 34,
        completed: true
      }],
      'KC': [{
        awayTeam: 'KC',
        homeTeam: 'DEN',
        awayScore: 27,
        homeScore: 24,
        completed: true
      }],
      'DEN': [{
        awayTeam: 'KC',
        homeTeam: 'DEN',
        awayScore: 27,
        homeScore: 24,
        completed: true
      }]
    };

    describe('Over/Under game matching', () => {
      test('should find game with direct key match (team1@team2)', () => {
        const pick = {
          type: 'overunder',
          team1: 'LAR',
          team2: 'JAX'
        };
        const game = findGame(pick, gamesMap);
        expect(game).toBeDefined();
        expect(game.awayTeam).toBe('LAR');
        expect(game.homeTeam).toBe('JAX');
      });

      test('should find game with reversed key match (team2@team1)', () => {
        const pick = {
          type: 'overunder',
          team1: 'JAX',
          team2: 'LAR'
        };
        const game = findGame(pick, gamesMap);
        expect(game).toBeDefined();
        expect(game.awayTeam).toBe('LAR');
        expect(game.homeTeam).toBe('JAX');
      });

      test('should return null for non-existent game', () => {
        const pick = {
          type: 'overunder',
          team1: 'BUF',
          team2: 'MIA'
        };
        const game = findGame(pick, gamesMap);
        expect(game).toBeNull();
      });
    });

    describe('Spread game matching', () => {
      test('should find game for team with completed game', () => {
        const pick = {
          type: 'spread',
          team: 'KC'
        };
        const game = findGame(pick, gamesMap);
        expect(game).toBeDefined();
        expect(game.awayTeam).toBe('KC');
      });

      test('should return null for team not in map', () => {
        const pick = {
          type: 'spread',
          team: 'BUF'
        };
        const game = findGame(pick, gamesMap);
        expect(game).toBeNull();
      });

      test('should filter to completed games', () => {
        const gamesWithPending = {
          'KC': [
            {
              awayTeam: 'KC',
              homeTeam: 'DEN',
              awayScore: 0,
              homeScore: 0,
              completed: false
            },
            {
              awayTeam: 'KC',
              homeTeam: 'LV',
              awayScore: 27,
              homeScore: 20,
              completed: true
            }
          ]
        };
        
        const pick = {
          type: 'spread',
          team: 'KC'
        };
        const game = findGame(pick, gamesWithPending);
        expect(game).toBeDefined();
        expect(game.completed).toBe(true);
        expect(game.homeTeam).toBe('LV');
      });
    });
  });

  describe('checkIfScoreDataExists', () => {
    test('should return true when game dates overlap with week range', () => {
      const weekStartDate = new Date('2025-10-16'); // Thursday
      const gamesMap = {
        gameDates: [
          new Date('2025-10-17'),
          new Date('2025-10-20')
        ],
        earliestGameDate: new Date('2025-10-17'),
        latestGameDate: new Date('2025-10-20')
      };
      
      const result = checkIfScoreDataExists(weekStartDate, gamesMap);
      expect(result).toBe(true);
    });

    test('should return false when no game dates overlap', () => {
      const weekStartDate = new Date('2025-10-16'); // Thursday
      const gamesMap = {
        gameDates: [
          new Date('2025-10-10'), // Previous week
          new Date('2025-10-11')
        ],
        earliestGameDate: new Date('2025-10-10'),
        latestGameDate: new Date('2025-10-11')
      };
      
      const result = checkIfScoreDataExists(weekStartDate, gamesMap);
      expect(result).toBe(false);
    });

    test('should return false when no game dates available', () => {
      const weekStartDate = new Date('2025-10-16');
      const gamesMap = {
        gameDates: [],
        earliestGameDate: null,
        latestGameDate: null
      };
      
      const result = checkIfScoreDataExists(weekStartDate, gamesMap);
      expect(result).toBe(false);
    });

    test('should handle games on week boundaries', () => {
      const weekStartDate = new Date('2025-10-16'); // Thursday
      const gamesMap = {
        gameDates: [
          new Date('2025-10-16'), // Thursday (start)
          new Date('2025-10-22')  // Next Wednesday (end)
        ],
        earliestGameDate: new Date('2025-10-16'),
        latestGameDate: new Date('2025-10-22')
      };
      
      const result = checkIfScoreDataExists(weekStartDate, gamesMap);
      expect(result).toBe(true);
    });
  });

  describe('buildGamesMap', () => {
    test('should build games map from scores and spreads data', () => {
      const scoresData = [
        ['Week', 'Year', 'Game ID', 'Date', 'Away Team', 'Away Team Name', 'Away Score', 'Home Team', 'Home Team Name', 'Home Score', 'Winner', 'Completed', 'Status'],
        [7, 2025, '401635511', new Date('2025-10-17'), 'LAR', 'Los Angeles Rams', 30, 'JAX', 'Jacksonville Jaguars', 34, 'JAX', true, 'Final']
      ];
      
      const spreadsData = [
        ['Week', 'Year', 'Game ID', 'Date', 'Away Team', 'Away Team Name', 'Home Team', 'Home Team Name', 'Spread', 'Over/Under', 'Status'],
        [7, 2025, '401635511', new Date('2025-10-17'), 'LAR', 'Los Angeles Rams', 'JAX', 'Jacksonville Jaguars', 'LAR -2.5', 47.5, 'Final']
      ];
      
      const result = buildGamesMap(scoresData, spreadsData);
      
      expect(result.games['LAR@JAX']).toBeDefined();
      expect(result.games['LAR@JAX'].awayScore).toBe(30);
      expect(result.games['LAR@JAX'].homeScore).toBe(34);
      expect(result.games['LAR@JAX'].totalPoints).toBe(64);
      expect(result.games['LAR@JAX'].completed).toBe(true);
      expect(result.games['LAR@JAX'].overUnder).toBe(47.5);
    });

    test('should track game dates correctly', () => {
      const scoresData = [
        ['Week', 'Year', 'Game ID', 'Date', 'Away Team', 'Away Team Name', 'Away Score', 'Home Team', 'Home Team Name', 'Home Score', 'Winner', 'Completed', 'Status'],
        [7, 2025, '401635511', new Date('2025-10-17'), 'LAR', 'Los Angeles Rams', 30, 'JAX', 'Jacksonville Jaguars', 34, 'JAX', true, 'Final'],
        [7, 2025, '401635512', new Date('2025-10-20'), 'KC', 'Kansas City Chiefs', 27, 'DEN', 'Denver Broncos', 24, 'KC', true, 'Final']
      ];
      
      const spreadsData = [['Week', 'Year', 'Game ID', 'Date', 'Away Team', 'Away Team Name', 'Home Team', 'Home Team Name', 'Spread', 'Over/Under', 'Status']];
      
      const result = buildGamesMap(scoresData, spreadsData);
      
      expect(result.gameDates.length).toBe(2);
      expect(result.earliestGameDate).toBeDefined();
      expect(result.latestGameDate).toBeDefined();
    });
  });
});

