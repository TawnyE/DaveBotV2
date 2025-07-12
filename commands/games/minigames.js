/**
 * Mini Games Command
 * Quick reaction and skill-based games
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minigames')
        .setDescription('Play quick mini games')
        .addSubcommand(subcommand =>
            subcommand
                .setName('reaction')
                .setDescription('Test your reaction time')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('math')
                .setDescription('Solve math problems quickly')
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
                .setName('memory')
                .setDescription('Memory sequence game')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('typing')
                .setDescription('Typing speed test')
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.mini_games')) {
            return interaction.reply({
                content: '❌ Mini games are currently disabled.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const MiniGames = require('../../games/miniGames');
        const miniGames = new MiniGames(client);

        switch (subcommand) {
            case 'reaction':
                await miniGames.startReactionGame(interaction);
                break;
            case 'math':
                await miniGames.startMathGame(interaction);
                break;
            case 'memory':
                await miniGames.startMemoryGame(interaction);
                break;
            case 'typing':
                await miniGames.startTypingGame(interaction);
                break;
        }
    }
};