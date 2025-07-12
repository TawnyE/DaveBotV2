/**
 * Hangman Game Command
 * Start and manage hangman games
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const HangmanGame = require('../../games/hangman');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Play a game of hangman')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new hangman game')
                .addStringOption(option =>
                    option.setName('difficulty')
                        .setDescription('Choose difficulty level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Easy (4-6 letters)', value: 'easy' },
                            { name: 'Medium (7-9 letters)', value: 'medium' },
                            { name: 'Hard (10+ letters)', value: 'hard' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('guess')
                .setDescription('Make a guess in the current game')
                .addStringOption(option =>
                    option.setName('letter')
                        .setDescription('Letter to guess')
                        .setRequired(true)
                        .setMaxLength(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the current game status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End the current game (creator only)')
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.hangman')) {
            return interaction.reply({
                content: '❌ Hangman game is currently disabled.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const hangmanGame = new HangmanGame(client);

        switch (subcommand) {
            case 'start':
                await hangmanGame.startGame(interaction);
                break;
            case 'guess':
                await hangmanGame.makeGuess(interaction);
                break;
            case 'status':
                await hangmanGame.showStatus(interaction);
                break;
            case 'end':
                await hangmanGame.endGame(interaction);
                break;
        }
    }
};