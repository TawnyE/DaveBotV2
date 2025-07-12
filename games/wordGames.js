/**
 * Word Games System for DaveBot V2
 * Various word-based puzzle games
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { v4: uuidv4 } = require('uuid');

class WordGames {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('games.word_games');
        this.activeGames = new Map();
        
        // Word databases
        this.words = {
            easy: ['APPLE', 'HOUSE', 'WATER', 'LIGHT', 'MUSIC', 'HAPPY', 'WORLD', 'PEACE'],
            medium: ['COMPUTER', 'ELEPHANT', 'RAINBOW', 'KITCHEN', 'FREEDOM', 'JOURNEY'],
            hard: ['EXTRAORDINARY', 'MAGNIFICENT', 'ENCYCLOPEDIA', 'REVOLUTIONARY']
        };

        this.rhymeWords = {
            'CAT': ['BAT', 'HAT', 'RAT', 'MAT', 'FAT'],
            'TREE': ['FREE', 'SEE', 'BEE', 'KEY', 'TEA'],
            'LIGHT': ['NIGHT', 'RIGHT', 'SIGHT', 'MIGHT', 'FIGHT'],
            'GAME': ['SAME', 'NAME', 'FAME', 'CAME', 'FRAME']
        };
    }

    /**
     * Start anagram game
     */
    async startAnagram(interaction) {
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        const channelId = interaction.channel.id;

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active word game in this channel!',
                ephemeral: true
            });
        }

        const word = this.getRandomWord(difficulty);
        const scrambled = this.scrambleWord(word);
        const gameId = uuidv4();

        const gameData = {
            id: gameId,
            type: 'anagram',
            channelId,
            word,
            scrambled,
            difficulty,
            startTime: Date.now(),
            solved: false
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('🔤 Anagram Challenge')
            .setDescription(`Unscramble this word: **${scrambled}**`)
            .addFields([
                {
                    name: '📏 Length',
                    value: `${word.length} letters`,
                    inline: true
                },
                {
                    name: '⭐ Difficulty',
                    value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
                    inline: true
                },
                {
                    name: '⏱️ Time Limit',
                    value: `${this.config.anagram_timeout} seconds`,
                    inline: true
                }
            ])
            .setColor(0x9C27B0)
            .setFooter({ text: 'Type your answer in chat!' });

        await interaction.reply({
            content: '🧩 **Anagram Time!** First correct answer wins!',
            embeds: [embed]
        });

        // Set timeout
        setTimeout(() => {
            this.timeoutGame(channelId);
        }, this.config.anagram_timeout * 1000);
    }

    /**
     * Start word chain game
     */
    async startWordChain(interaction) {
        const channelId = interaction.channel.id;

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active word game in this channel!',
                ephemeral: true
            });
        }

        const startWord = this.getRandomWord('easy');
        const gameId = uuidv4();

        const gameData = {
            id: gameId,
            type: 'wordchain',
            channelId,
            currentWord: startWord,
            usedWords: new Set([startWord.toLowerCase()]),
            participants: new Map(),
            lastPlayer: null,
            startTime: Date.now(),
            active: true
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('🔗 Word Chain Game')
            .setDescription(`Starting word: **${startWord}**\n\nNext word must start with **${startWord.slice(-1)}**`)
            .addFields([
                {
                    name: '📋 Rules',
                    value: '• Next word must start with the last letter of the previous word\n• No repeating words\n• Must be a real English word\n• 60 seconds between turns',
                    inline: false
                }
            ])
            .setColor(0x4CAF50)
            .setFooter({ text: 'Type a word to continue the chain!' });

        await interaction.reply({
            content: '🔗 **Word Chain Started!** Who can continue?',
            embeds: [embed]
        });
    }

    /**
     * Start unscramble game
     */
    async startUnscramble(interaction) {
        const channelId = interaction.channel.id;

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active word game in this channel!',
                ephemeral: true
            });
        }

        const word = this.getRandomWord('medium');
        const scrambled = this.scrambleWord(word);
        const hint = this.getWordHint(word);
        const gameId = uuidv4();

        const gameData = {
            id: gameId,
            type: 'unscramble',
            channelId,
            word,
            scrambled,
            hint,
            startTime: Date.now(),
            solved: false
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('🔀 Word Unscramble')
            .setDescription(`Unscramble: **${scrambled}**`)
            .addFields([
                {
                    name: '💡 Hint',
                    value: hint,
                    inline: false
                }
            ])
            .setColor(0xFF9800)
            .setFooter({ text: 'Type your answer in chat!' });

        await interaction.reply({
            content: '🔀 **Unscramble Challenge!** What\'s the word?',
            embeds: [embed]
        });

        // Set timeout
        setTimeout(() => {
            this.timeoutGame(channelId);
        }, 45000);
    }

    /**
     * Start rhyme game
     */
    async startRhyme(interaction) {
        const channelId = interaction.channel.id;

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active word game in this channel!',
                ephemeral: true
            });
        }

        const baseWords = Object.keys(this.rhymeWords);
        const baseWord = baseWords[Math.floor(Math.random() * baseWords.length)];
        const rhymes = this.rhymeWords[baseWord];
        const gameId = uuidv4();

        const gameData = {
            id: gameId,
            type: 'rhyme',
            channelId,
            baseWord,
            rhymes,
            foundRhymes: new Set(),
            participants: new Map(),
            startTime: Date.now(),
            active: true
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('🎵 Rhyme Time')
            .setDescription(`Find words that rhyme with: **${baseWord}**`)
            .addFields([
                {
                    name: '🎯 Goal',
                    value: `Find ${rhymes.length} rhyming words`,
                    inline: true
                },
                {
                    name: '📊 Progress',
                    value: `0/${rhymes.length} found`,
                    inline: true
                }
            ])
            .setColor(0xE91E63)
            .setFooter({ text: 'Type rhyming words in chat!' });

        await interaction.reply({
            content: '🎵 **Rhyme Challenge!** Find all the rhymes!',
            embeds: [embed]
        });

        // Set timeout
        setTimeout(() => {
            this.timeoutGame(channelId);
        }, 120000); // 2 minutes for rhyme games
    }

    /**
     * Handle message-based word game responses
     */
    static async handleMessage(message, client) {
        if (message.author.bot) return;

        const channelId = message.channel.id;
        const wordGames = new WordGames(client);
        const gameData = wordGames.activeGames.get(channelId);

        if (!gameData) return;

        const content = message.content.toUpperCase().trim();

        switch (gameData.type) {
            case 'anagram':
            case 'unscramble':
                await wordGames.handleWordGuess(message, gameData, content);
                break;
            case 'wordchain':
                await wordGames.handleWordChain(message, gameData, content);
                break;
            case 'rhyme':
                await wordGames.handleRhyme(message, gameData, content);
                break;
        }
    }

    /**
     * Handle word guess for anagram/unscramble
     */
    async handleWordGuess(message, gameData, guess) {
        if (gameData.solved) return;

        if (guess === gameData.word) {
            gameData.solved = true;
            this.activeGames.delete(gameData.channelId);

            // Award rewards
            const coins = this.getDifficultyReward(gameData.difficulty || 'medium');
            await this.awardRewards(message.author.id, message.guild.id, coins, 'Word game win');

            const embed = new EmbedBuilder()
                .setTitle('🎉 Correct!')
                .setDescription(`${message.author} solved it! The word was **${gameData.word}**`)
                .addFields([
                    {
                        name: '🎁 Rewards',
                        value: `+${coins} coins\n+50 XP`,
                        inline: true
                    },
                    {
                        name: '⏱️ Time',
                        value: `${Math.round((Date.now() - gameData.startTime) / 1000)}s`,
                        inline: true
                    }
                ])
                .setColor(0x28A745);

            await message.reply({ embeds: [embed] });
        }
    }

    /**
     * Handle word chain
     */
    async handleWordChain(message, gameData, word) {
        if (!gameData.active) return;
        if (message.author.id === gameData.lastPlayer) {
            return message.react('❌');
        }

        const expectedStart = gameData.currentWord.slice(-1);
        if (!word.startsWith(expectedStart)) {
            return message.react('❌');
        }

        if (gameData.usedWords.has(word.toLowerCase())) {
            return message.react('🔄'); // Already used
        }

        // Valid word
        gameData.currentWord = word;
        gameData.usedWords.add(word.toLowerCase());
        gameData.lastPlayer = message.author.id;

        // Update participant score
        const userId = message.author.id;
        const currentScore = gameData.participants.get(userId) || 0;
        gameData.participants.set(userId, currentScore + 1);

        await message.react('✅');

        // Award small reward
        await this.awardRewards(userId, message.guild.id, 10, 'Word chain contribution');

        // Check if we should end the game (after 20 words or 10 minutes)
        if (gameData.usedWords.size >= 20 || (Date.now() - gameData.startTime) > 600000) {
            await this.endWordChain(gameData, message.channel);
        }
    }

    /**
     * Handle rhyme game
     */
    async handleRhyme(message, gameData, word) {
        if (!gameData.active) return;

        if (gameData.rhymes.includes(word) && !gameData.foundRhymes.has(word)) {
            gameData.foundRhymes.add(word);
            
            const userId = message.author.id;
            const currentScore = gameData.participants.get(userId) || 0;
            gameData.participants.set(userId, currentScore + 1);

            await message.react('✅');
            await this.awardRewards(userId, message.guild.id, 15, 'Rhyme found');

            // Check if all rhymes found
            if (gameData.foundRhymes.size >= gameData.rhymes.length) {
                await this.endRhymeGame(gameData, message.channel);
            }
        }
    }

    /**
     * End word chain game
     */
    async endWordChain(gameData, channel) {
        gameData.active = false;
        this.activeGames.delete(gameData.channelId);

        const participants = Array.from(gameData.participants.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle('🏁 Word Chain Complete!')
            .setDescription(`Game ended with ${gameData.usedWords.size} words!`)
            .setColor(0x4CAF50);

        if (participants.length > 0) {
            const leaderboard = await Promise.all(
                participants.map(async ([userId, score], index) => {
                    try {
                        const user = await this.client.users.fetch(userId);
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        return `${medal} ${user.username}: ${score} words`;
                    } catch {
                        return `${index + 1}. Unknown User: ${score} words`;
                    }
                })
            );

            embed.addFields([
                {
                    name: '🏆 Top Contributors',
                    value: leaderboard.join('\n'),
                    inline: false
                }
            ]);
        }

        await channel.send({ embeds: [embed] });
    }

    /**
     * End rhyme game
     */
    async endRhymeGame(gameData, channel) {
        gameData.active = false;
        this.activeGames.delete(gameData.channelId);

        const participants = Array.from(gameData.participants.entries())
            .sort((a, b) => b[1] - a[1]);

        const embed = new EmbedBuilder()
            .setTitle('🎵 All Rhymes Found!')
            .setDescription(`Congratulations! All rhymes for **${gameData.baseWord}** were discovered!`)
            .addFields([
                {
                    name: '📝 All Rhymes',
                    value: Array.from(gameData.foundRhymes).join(', '),
                    inline: false
                }
            ])
            .setColor(0xE91E63);

        if (participants.length > 0) {
            const winner = participants[0];
            try {
                const user = await this.client.users.fetch(winner[0]);
                embed.addFields([
                    {
                        name: '🏆 Top Contributor',
                        value: `${user.username} found ${winner[1]} rhymes!`,
                        inline: false
                    }
                ]);
            } catch (error) {
                // Handle error silently
            }
        }

        await channel.send({ embeds: [embed] });
    }

    /**
     * Utility methods
     */
    getRandomWord(difficulty) {
        const words = this.words[difficulty] || this.words.medium;
        return words[Math.floor(Math.random() * words.length)];
    }

    scrambleWord(word) {
        const letters = word.split('');
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        return letters.join('');
    }

    getWordHint(word) {
        const hints = {
            'COMPUTER': 'Electronic device for processing data',
            'ELEPHANT': 'Large mammal with a trunk',
            'RAINBOW': 'Colorful arc in the sky after rain',
            'KITCHEN': 'Room where food is prepared',
            'FREEDOM': 'State of being free',
            'JOURNEY': 'Act of traveling from one place to another'
        };
        return hints[word] || 'No hint available';
    }

    getDifficultyReward(difficulty) {
        const rewards = { easy: 25, medium: 50, hard: 100 };
        return rewards[difficulty] || 50;
    }

    async awardRewards(userId, guildId, coins, reason) {
        // Award coins
        if (this.client.config.isEnabled('games.economy')) {
            await this.client.database.run(
                'UPDATE economy SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?',
                [coins, coins, userId]
            );
        }

        // Award XP
        if (this.client.config.isEnabled('leveling')) {
            const LevelingSystem = require('../systems/leveling');
            const leveling = new LevelingSystem(this.client);
            await leveling.addXP(userId, guildId, 50, reason);
        }
    }

    timeoutGame(channelId) {
        const gameData = this.activeGames.get(channelId);
        if (!gameData || gameData.solved || !gameData.active) return;

        this.activeGames.delete(channelId);

        this.client.channels.fetch(channelId).then(channel => {
            const embed = new EmbedBuilder()
                .setTitle('⏰ Time\'s Up!')
                .setDescription('Nobody solved the puzzle in time!')
                .setColor(0x6C757D);

            if (gameData.word) {
                embed.addFields([
                    {
                        name: '✅ Answer',
                        value: gameData.word,
                        inline: false
                    }
                ]);
            }

            channel.send({ embeds: [embed] });
        }).catch(() => {});
    }
}

module.exports = WordGames;