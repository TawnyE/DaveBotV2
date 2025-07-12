/**
 * Trivia Game Command
 * Interactive trivia with multiple categories and difficulties
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Play trivia games')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a trivia game')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Choose trivia category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'General Knowledge', value: 'general' },
                            { name: 'Science', value: 'science' },
                            { name: 'History', value: 'history' },
                            { name: 'Sports', value: 'sports' },
                            { name: 'Entertainment', value: 'entertainment' },
                            { name: 'Geography', value: 'geography' },
                            { name: 'Random', value: 'random' }
                        )
                )
                .addStringOption(option =>
                    option.setName('difficulty')
                        .setDescription('Choose difficulty level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Easy', value: 'easy' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'Hard', value: 'hard' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Show trivia leaderboard')
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.trivia')) {
            return interaction.reply({
                content: '❌ Trivia games are currently disabled.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const TriviaGame = require('../../games/trivia');
        const triviaGame = new TriviaGame(client);

        switch (subcommand) {
            case 'start':
                await triviaGame.startGame(interaction);
                break;
            case 'leaderboard':
                await triviaGame.showLeaderboard(interaction);
                break;
        }
    }
};