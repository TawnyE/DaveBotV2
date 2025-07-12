/**
 * Word Games Command
 * Various word-based mini games
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordgames')
        .setDescription('Play word-based games')
        .addSubcommand(subcommand =>
            subcommand
                .setName('anagram')
                .setDescription('Solve anagram puzzles')
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
                .setName('wordchain')
                .setDescription('Start a word chain game')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unscramble')
                .setDescription('Unscramble words')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rhyme')
                .setDescription('Find words that rhyme')
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.word_games')) {
            return interaction.reply({
                content: '❌ Word games are currently disabled.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const WordGames = require('../../games/wordGames');
        const wordGames = new WordGames(client);

        switch (subcommand) {
            case 'anagram':
                await wordGames.startAnagram(interaction);
                break;
            case 'wordchain':
                await wordGames.startWordChain(interaction);
                break;
            case 'unscramble':
                await wordGames.startUnscramble(interaction);
                break;
            case 'rhyme':
                await wordGames.startRhyme(interaction);
                break;
        }
    }
};