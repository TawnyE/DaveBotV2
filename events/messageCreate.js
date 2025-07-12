/**
 * Message event handler for XP system and other message-based features
 */

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Ignore DMs
        if (!message.guild) return;

        try {
            // Ensure user exists in database
            await client.database.upsertUser(message.author);

            // Handle XP system if enabled
            if (client.config.isEnabled('leveling')) {
                const LevelingSystem = require('../systems/leveling');
                const levelingSystem = new LevelingSystem(client);
                await levelingSystem.handleMessage(message);
            }

            // Check for hangman game responses
            if (client.config.isEnabled('games.hangman')) {
                const HangmanGame = require('../games/hangman');
                await HangmanGame.handleMessage(message, client);
            }

            // Check for word game responses
            if (client.config.isEnabled('games.word_games')) {
                const WordGames = require('../games/wordGames');
                await WordGames.handleMessage(message, client);
            }

            // Check for mini game responses
            if (client.config.isEnabled('games.mini_games')) {
                const MiniGames = require('../games/miniGames');
                await MiniGames.handleMessage(message, client);
            }

        } catch (error) {
            client.logger.error('Error handling message:', error);
        }
    }
};