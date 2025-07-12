/**
 * Hangman Game System for DaveBot V2
 * Manages hangman games with multiplayer support
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { v4: uuidv4 } = require('uuid');

class HangmanGame {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('games.hangman');
        
        // Word lists by difficulty
        this.wordLists = {
            easy: ['CAT', 'DOG', 'BIRD', 'FISH', 'TREE', 'HOUSE', 'CHAIR', 'TABLE', 'PHONE', 'BOOK'],
            medium: ['COMPUTER', 'ELEPHANT', 'MOUNTAIN', 'RAINBOW', 'CHOCOLATE', 'KEYBOARD', 'PAINTING'],
            hard: ['EXTRAORDINARY', 'MAGNIFICENT', 'TREMENDOUS', 'SPECTACULAR', 'PHENOMENON', 'ENCYCLOPEDIA']
        };
    }

    /**
     * Start a new hangman game
     */
    async startGame(interaction) {
        const channelId = interaction.channel.id;
        
        // Check if there's already an active game in this channel
        const existingGame = await this.client.database.get(
            'SELECT id FROM hangman_games WHERE channel_id = ? AND status = "active"',
            [channelId]
        );

        if (existingGame) {
            return interaction.reply({
                content: '❌ There is already an active hangman game in this channel! Use `/hangman end` to end it first.',
                ephemeral: true
            });
        }

        const difficulty = interaction.options.getString('difficulty') || 'medium';
        const word = this.getRandomWord(difficulty);
        const gameId = uuidv4();

        // Save game to database
        await this.client.database.run(
            `INSERT INTO hangman_games 
             (id, channel_id, word, guessed_letters, wrong_guesses, status, created_by, participants) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [gameId, channelId, word, JSON.stringify([]), 0, 'active', interaction.user.id, JSON.stringify([interaction.user.id])]
        );

        const embed = this.createGameEmbed(word, [], 0, difficulty);
        const row = this.createAlphabetButtons([]);

        await interaction.reply({
            content: `🎮 **Hangman Game Started!** 🎮\nCreated by ${interaction.user}\n\nGuess letters by clicking the buttons below!`,
            embeds: [embed],
            components: row
        });
    }

    /**
     * Handle letter guess via slash command
     */
    async makeGuess(interaction) {
        const channelId = interaction.channel.id;
        const letter = interaction.options.getString('letter').toUpperCase();

        if (!/^[A-Z]$/.test(letter)) {
            return interaction.reply({
                content: '❌ Please enter a single letter (A-Z).',
                ephemeral: true
            });
        }

        await this.processGuess(interaction, letter);
    }

    /**
     * Process a letter guess
     */
    async processGuess(interaction, letter) {
        const channelId = interaction.channel.id;
        
        const game = await this.client.database.get(
            'SELECT * FROM hangman_games WHERE channel_id = ? AND status = "active"',
            [channelId]
        );

        if (!game) {
            return interaction.reply({
                content: '❌ No active hangman game found in this channel.',
                ephemeral: true
            });
        }

        const guessedLetters = JSON.parse(game.guessed_letters);
        
        if (guessedLetters.includes(letter)) {
            return interaction.reply({
                content: `❌ Letter **${letter}** has already been guessed!`,
                ephemeral: true
            });
        }

        // Add letter to guessed letters
        guessedLetters.push(letter);
        
        // Check if letter is in word
        const isCorrect = game.word.includes(letter);
        let wrongGuesses = game.wrong_guesses;
        
        if (!isCorrect) {
            wrongGuesses++;
        }

        // Add user to participants if not already there
        const participants = JSON.parse(game.participants);
        if (!participants.includes(interaction.user.id)) {
            participants.push(interaction.user.id);
        }

        // Update game in database
        await this.client.database.run(
            `UPDATE hangman_games 
             SET guessed_letters = ?, wrong_guesses = ?, participants = ? 
             WHERE id = ?`,
            [JSON.stringify(guessedLetters), wrongGuesses, JSON.stringify(participants), game.id]
        );

        // Check win/lose conditions
        const wordProgress = this.getWordProgress(game.word, guessedLetters);
        const isWin = !wordProgress.includes('_');
        const isLose = wrongGuesses >= this.config.max_wrong_guesses;

        if (isWin || isLose) {
            await this.endGameWithResult(interaction, game, isWin, participants);
        } else {
            await this.updateGameDisplay(interaction, game, guessedLetters, wrongGuesses, letter, isCorrect);
        }
    }

    /**
     * Handle button interactions for letter guessing
     */
    static async handleButtonInteraction(interaction, client) {
        if (!interaction.customId.startsWith('hangman_letter_')) return;
        
        const letter = interaction.customId.split('_')[2];
        const hangmanGame = new HangmanGame(client);
        await hangmanGame.processGuess(interaction, letter);
    }

    /**
     * Handle message-based guesses
     */
    static async handleMessage(message, client) {
        const channelId = message.channel.id;
        
        const game = await client.database.get(
            'SELECT * FROM hangman_games WHERE channel_id = ? AND status = "active"',
            [channelId]
        );

        if (!game) return;

        const content = message.content.toUpperCase().trim();
        
        // Check if it's a single letter guess
        if (/^[A-Z]$/.test(content)) {
            const hangmanGame = new HangmanGame(client);
            
            // Create a pseudo-interaction for message-based guessing
            const pseudoInteraction = {
                user: message.author,
                channel: message.channel,
                reply: async (options) => {
                    if (options.ephemeral) {
                        // For ephemeral-like behavior, delete after a few seconds
                        const reply = await message.reply(options.content || options);
                        setTimeout(() => reply.delete().catch(() => {}), 5000);
                    } else {
                        return message.reply(options.content || options);
                    }
                },
                editReply: async (options) => {
                    // Find the last bot message in the channel and edit it
                    const messages = await message.channel.messages.fetch({ limit: 10 });
                    const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
                    if (botMessage) {
                        return botMessage.edit(options);
                    }
                }
            };

            await hangmanGame.processGuess(pseudoInteraction, content);
            
            // Delete the user's message to keep the channel clean
            setTimeout(() => message.delete().catch(() => {}), 1000);
        }
    }

    /**
     * Show current game status
     */
    async showStatus(interaction) {
        const channelId = interaction.channel.id;
        
        const game = await this.client.database.get(
            'SELECT * FROM hangman_games WHERE channel_id = ? AND status = "active"',
            [channelId]
        );

        if (!game) {
            return interaction.reply({
                content: '❌ No active hangman game found in this channel.',
                ephemeral: true
            });
        }

        const guessedLetters = JSON.parse(game.guessed_letters);
        const embed = this.createGameEmbed(game.word, guessedLetters, game.wrong_guesses);
        const row = this.createAlphabetButtons(guessedLetters);

        await interaction.reply({
            embeds: [embed],
            components: row,
            ephemeral: true
        });
    }

    /**
     * End the current game
     */
    async endGame(interaction) {
        const channelId = interaction.channel.id;
        
        const game = await this.client.database.get(
            'SELECT * FROM hangman_games WHERE channel_id = ? AND status = "active"',
            [channelId]
        );

        if (!game) {
            return interaction.reply({
                content: '❌ No active hangman game found in this channel.',
                ephemeral: true
            });
        }

        // Check if user is the creator or has admin permissions
        if (game.created_by !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ Only the game creator or administrators can end the game.',
                ephemeral: true
            });
        }

        // Mark game as ended
        await this.client.database.run(
            'UPDATE hangman_games SET status = "ended" WHERE id = ?',
            [game.id]
        );

        const embed = new EmbedBuilder()
            .setTitle('🛑 Game Ended')
            .setDescription(`The hangman game has been ended by ${interaction.user}.\n\n**The word was: ${game.word}**`)
            .setColor(0x6C757D)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }

    /**
     * Create game embed
     */
    createGameEmbed(word, guessedLetters, wrongGuesses, difficulty = 'medium') {
        const wordProgress = this.getWordProgress(word, guessedLetters);
        const hangmanArt = this.getHangmanArt(wrongGuesses);
        
        const embed = new EmbedBuilder()
            .setTitle('🎯 Hangman Game')
            .addFields([
                {
                    name: '📝 Word',
                    value: `\`\`\`${wordProgress}\`\`\``,
                    inline: false
                },
                {
                    name: '🎨 Hangman',
                    value: `\`\`\`${hangmanArt}\`\`\``,
                    inline: true
                },
                {
                    name: '📊 Progress',
                    value: `**Wrong Guesses:** ${wrongGuesses}/${this.config.max_wrong_guesses}\n**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
                    inline: true
                }
            ])
            .setColor(wrongGuesses >= this.config.max_wrong_guesses ? 0xDC3545 : 0x007BFF)
            .setTimestamp();

        if (guessedLetters.length > 0) {
            embed.addFields([
                {
                    name: '🔤 Guessed Letters',
                    value: guessedLetters.sort().join(', '),
                    inline: false
                }
            ]);
        }

        return embed;
    }

    /**
     * Create alphabet buttons
     */
    createAlphabetButtons(guessedLetters) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const rows = [];
        
        for (let i = 0; i < alphabet.length; i += 5) {
            const row = new ActionRowBuilder();
            
            for (let j = i; j < Math.min(i + 5, alphabet.length); j++) {
                const letter = alphabet[j];
                const isGuessed = guessedLetters.includes(letter);
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`hangman_letter_${letter}`)
                        .setLabel(letter)
                        .setStyle(isGuessed ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(isGuessed)
                );
            }
            
            rows.push(row);
        }
        
        return rows;
    }

    /**
     * Get word progress with guessed letters
     */
    getWordProgress(word, guessedLetters) {
        return word.split('').map(letter => 
            guessedLetters.includes(letter) ? letter : '_'
        ).join(' ');
    }

    /**
     * Get hangman ASCII art based on wrong guesses
     */
    getHangmanArt(wrongGuesses) {
        const stages = [
            '  ┌─────┐\n  │     │\n  │      \n  │      \n  │      \n  │      \n──┴──    ',
            '  ┌─────┐\n  │     │\n  │     ○\n  │      \n  │      \n  │      \n──┴──    ',
            '  ┌─────┐\n  │     │\n  │     ○\n  │     │\n  │      \n  │      \n──┴──    ',
            '  ┌─────┐\n  │     │\n  │     ○\n  │    ╱│\n  │      \n  │      \n──┴──    ',
            '  ┌─────┐\n  │     │\n  │     ○\n  │    ╱│╲\n  │      \n  │      \n──┴──    ',
            '  ┌─────┐\n  │     │\n  │     ○\n  │    ╱│╲\n  │    ╱ \n  │      \n──┴──    ',
            '  ┌─────┐\n  │     │\n  │     ○\n  │    ╱│╲\n  │    ╱ ╲\n  │      \n──┴──    '
        ];
        
        return stages[Math.min(wrongGuesses, stages.length - 1)];
    }

    /**
     * Get random word by difficulty
     */
    getRandomWord(difficulty) {
        const words = this.wordLists[difficulty] || this.wordLists.medium;
        return words[Math.floor(Math.random() * words.length)];
    }

    /**
     * End game with result and award XP
     */
    async endGameWithResult(interaction, game, isWin, participants) {
        // Mark game as completed
        await this.client.database.run(
            'UPDATE hangman_games SET status = ? WHERE id = ?',
            [isWin ? 'won' : 'lost', game.id]
        );

        const guessedLetters = JSON.parse(game.guessed_letters);
        const embed = new EmbedBuilder()
            .setTitle(isWin ? '🎉 Game Won!' : '💀 Game Over!')
            .setDescription(isWin ? 
                `Congratulations! You guessed the word correctly!` : 
                `Better luck next time! The word was **${game.word}**.`)
            .addFields([
                {
                    name: '📝 Word',
                    value: `\`\`\`${game.word}\`\`\``,
                    inline: false
                },
                {
                    name: '👥 Participants',
                    value: participants.map(id => `<@${id}>`).join(', '),
                    inline: false
                }
            ])
            .setColor(isWin ? 0x28A745 : 0xDC3545)
            .setTimestamp();

        if (isWin) {
            // Award XP to participants
            for (const userId of participants) {
                // Award economy points if enabled
                if (this.client.config.isEnabled('games.economy')) {
                    const EconomySystem = require('../systems/economy');
                    const economy = new EconomySystem(this.client);
                    await economy.addCoins(userId, 50, 'Hangman game win');
                }

                // Award XP if leveling is enabled
                if (this.client.config.isEnabled('leveling')) {
                    const LevelingSystem = require('../systems/leveling');
                    const leveling = new LevelingSystem(this.client);
                    await leveling.addXP(userId, interaction.guild.id, 100, 'Hangman game win');
                }
            }

            embed.addFields([
                {
                    name: '🎁 Rewards',
                    value: '• +50 coins\n• +100 XP',
                    inline: false
                }
            ]);
        }

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
                components: []
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: []
            });
        }
    }

    /**
     * Update game display after a guess
     */
    async updateGameDisplay(interaction, game, guessedLetters, wrongGuesses, letter, isCorrect) {
        const embed = this.createGameEmbed(game.word, guessedLetters, wrongGuesses);
        const row = this.createAlphabetButtons(guessedLetters);

        const resultText = isCorrect ? 
            `✅ **${letter}** is in the word!` : 
            `❌ **${letter}** is not in the word.`;

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                content: `🎮 **Hangman Game** 🎮\n\n${resultText}`,
                embeds: [embed],
                components: row
            });
        } else {
            await interaction.reply({
                content: `🎮 **Hangman Game** 🎮\n\n${resultText}`,
                embeds: [embed],
                components: row
            });
        }
    }
}

module.exports = HangmanGame;