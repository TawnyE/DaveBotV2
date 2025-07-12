/**
 * Mini Games System for DaveBot V2
 * Quick reaction and skill-based games
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { v4: uuidv4 } = require('uuid');

class MiniGames {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('games.mini_games');
        this.activeGames = new Map();
        
        this.typingTexts = [
            "The quick brown fox jumps over the lazy dog.",
            "Pack my box with five dozen liquor jugs.",
            "How vexingly quick daft zebras jump!",
            "Bright vixens jump; dozy fowl quack.",
            "Sphinx of black quartz, judge my vow."
        ];
    }

    /**
     * Start reaction time game
     */
    async startReactionGame(interaction) {
        const channelId = interaction.channel.id;
        const gameId = uuidv4();

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active mini game in this channel!',
                ephemeral: true
            });
        }

        const gameData = {
            id: gameId,
            type: 'reaction',
            channelId,
            startTime: null,
            participants: new Map(),
            active: false
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('⚡ Reaction Time Challenge')
            .setDescription('Get ready! Click the button as soon as it turns green!')
            .setColor(0xDC3545)
            .setFooter({ text: 'Wait for the button to change...' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`reaction_wait_${gameId}`)
                    .setLabel('🔴 WAIT...')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

        await interaction.reply({
            content: '⚡ **Reaction Game Starting!**',
            embeds: [embed],
            components: [row]
        });

        // Random delay between 2-8 seconds
        const delay = Math.random() * 6000 + 2000;
        
        setTimeout(async () => {
            await this.activateReactionButton(interaction, gameData);
        }, delay);
    }

    /**
     * Activate reaction button
     */
    async activateReactionButton(interaction, gameData) {
        gameData.active = true;
        gameData.startTime = Date.now();

        const embed = new EmbedBuilder()
            .setTitle('⚡ Reaction Time Challenge')
            .setDescription('🟢 **CLICK NOW!** 🟢')
            .setColor(0x28A745)
            .setFooter({ text: 'First click wins!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`reaction_click_${gameData.id}`)
                    .setLabel('🟢 CLICK!')
                    .setStyle(ButtonStyle.Success)
            );

        try {
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                this.timeoutReactionGame(gameData);
            }, 10000);
        } catch (error) {
            this.client.logger.error('Error activating reaction button:', error);
        }
    }

    /**
     * Start math game
     */
    async startMathGame(interaction) {
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        const channelId = interaction.channel.id;
        const gameId = uuidv4();

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active mini game in this channel!',
                ephemeral: true
            });
        }

        const problem = this.generateMathProblem(difficulty);
        
        const gameData = {
            id: gameId,
            type: 'math',
            channelId,
            problem,
            difficulty,
            startTime: Date.now(),
            solved: false
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('🧮 Math Challenge')
            .setDescription(`Solve this problem: **${problem.question}**`)
            .addFields([
                {
                    name: '⭐ Difficulty',
                    value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
                    inline: true
                },
                {
                    name: '⏱️ Time Limit',
                    value: `${this.config.math_timeout} seconds`,
                    inline: true
                }
            ])
            .setColor(0x2196F3)
            .setFooter({ text: 'Type your answer in chat!' });

        await interaction.reply({
            content: '🧮 **Math Challenge!** First correct answer wins!',
            embeds: [embed]
        });

        // Set timeout
        setTimeout(() => {
            this.timeoutMathGame(gameData);
        }, this.config.math_timeout * 1000);
    }

    /**
     * Start memory game
     */
    async startMemoryGame(interaction) {
        const channelId = interaction.channel.id;
        const gameId = uuidv4();

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active mini game in this channel!',
                ephemeral: true
            });
        }

        const sequence = this.generateMemorySequence(5);
        
        const gameData = {
            id: gameId,
            type: 'memory',
            channelId,
            sequence,
            currentStep: 0,
            participants: new Map(),
            showingSequence: true
        };

        this.activeGames.set(channelId, gameData);

        await this.showMemorySequence(interaction, gameData);
    }

    /**
     * Start typing game
     */
    async startTypingGame(interaction) {
        const channelId = interaction.channel.id;
        const gameId = uuidv4();

        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active mini game in this channel!',
                ephemeral: true
            });
        }

        const text = this.typingTexts[Math.floor(Math.random() * this.typingTexts.length)];
        
        const gameData = {
            id: gameId,
            type: 'typing',
            channelId,
            text,
            startTime: Date.now(),
            participants: new Map(),
            finished: false
        };

        this.activeGames.set(channelId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('⌨️ Typing Speed Test')
            .setDescription(`Type this text exactly as shown:\n\n\`\`\`${text}\`\`\``)
            .addFields([
                {
                    name: '📏 Length',
                    value: `${text.length} characters`,
                    inline: true
                },
                {
                    name: '⏱️ Time Limit',
                    value: '60 seconds',
                    inline: true
                }
            ])
            .setColor(0xFF9800)
            .setFooter({ text: 'Type the text in chat!' });

        await interaction.reply({
            content: '⌨️ **Typing Challenge!** How fast can you type?',
            embeds: [embed]
        });

        // Set timeout
        setTimeout(() => {
            this.timeoutTypingGame(gameData);
        }, 60000);
    }

    /**
     * Handle button interactions
     */
    static async handleButtonInteraction(interaction, client) {
        const customId = interaction.customId;
        
        if (customId.startsWith('reaction_click_')) {
            const gameId = customId.split('_')[2];
            const miniGames = new MiniGames(client);
            await miniGames.handleReactionClick(interaction, gameId);
        } else if (customId.startsWith('memory_')) {
            const [, , gameId, step] = customId.split('_');
            const miniGames = new MiniGames(client);
            await miniGames.handleMemoryClick(interaction, gameId, parseInt(step));
        }
    }

    /**
     * Handle message-based responses
     */
    static async handleMessage(message, client) {
        if (message.author.bot) return;

        const channelId = message.channel.id;
        const miniGames = new MiniGames(client);
        const gameData = miniGames.activeGames.get(channelId);

        if (!gameData) return;

        const content = message.content.trim();

        switch (gameData.type) {
            case 'math':
                await miniGames.handleMathAnswer(message, gameData, content);
                break;
            case 'typing':
                await miniGames.handleTypingAttempt(message, gameData, content);
                break;
        }
    }

    /**
     * Handle reaction click
     */
    async handleReactionClick(interaction, gameId) {
        const gameData = this.activeGames.get(interaction.channel.id);
        
        if (!gameData || gameData.id !== gameId || !gameData.active) {
            return interaction.reply({
                content: '❌ This reaction game is no longer active.',
                ephemeral: true
            });
        }

        const reactionTime = Date.now() - gameData.startTime;
        this.activeGames.delete(interaction.channel.id);

        // Award rewards based on reaction time
        const coins = Math.max(10, 100 - Math.floor(reactionTime / 10));
        await this.awardRewards(interaction.user.id, interaction.guild.id, coins, 'Reaction game win');

        const embed = new EmbedBuilder()
            .setTitle('⚡ Reaction Complete!')
            .setDescription(`${interaction.user} clicked first!`)
            .addFields([
                {
                    name: '⏱️ Reaction Time',
                    value: `${reactionTime}ms`,
                    inline: true
                },
                {
                    name: '🎁 Rewards',
                    value: `+${coins} coins`,
                    inline: true
                }
            ])
            .setColor(0x28A745);

        await interaction.update({
            embeds: [embed],
            components: []
        });
    }

    /**
     * Handle math answer
     */
    async handleMathAnswer(message, gameData, answer) {
        if (gameData.solved) return;

        const numAnswer = parseFloat(answer);
        if (isNaN(numAnswer)) return;

        if (Math.abs(numAnswer - gameData.problem.answer) < 0.01) {
            gameData.solved = true;
            this.activeGames.delete(gameData.channelId);

            const timeTaken = Date.now() - gameData.startTime;
            const coins = this.getMathReward(gameData.difficulty, timeTaken);
            
            await this.awardRewards(message.author.id, message.guild.id, coins, 'Math game win');

            const embed = new EmbedBuilder()
                .setTitle('🧮 Correct!')
                .setDescription(`${message.author} solved it! **${gameData.problem.answer}**`)
                .addFields([
                    {
                        name: '⏱️ Time',
                        value: `${Math.round(timeTaken / 1000)}s`,
                        inline: true
                    },
                    {
                        name: '🎁 Rewards',
                        value: `+${coins} coins`,
                        inline: true
                    }
                ])
                .setColor(0x28A745);

            await message.reply({ embeds: [embed] });
        }
    }

    /**
     * Handle typing attempt
     */
    async handleTypingAttempt(message, gameData, attempt) {
        if (gameData.finished) return;

        const userId = message.author.id;
        const timeTaken = Date.now() - gameData.startTime;
        
        // Calculate accuracy
        const accuracy = this.calculateTypingAccuracy(gameData.text, attempt);
        const wpm = this.calculateWPM(gameData.text, timeTaken);

        gameData.participants.set(userId, {
            accuracy,
            wpm,
            time: timeTaken,
            user: message.author
        });

        if (accuracy === 100) {
            // Perfect typing
            gameData.finished = true;
            this.activeGames.delete(gameData.channelId);

            const coins = Math.round(wpm * 2);
            await this.awardRewards(userId, message.guild.id, coins, 'Typing game win');

            const embed = new EmbedBuilder()
                .setTitle('⌨️ Perfect Typing!')
                .setDescription(`${message.author} typed it perfectly!`)
                .addFields([
                    {
                        name: '📊 Stats',
                        value: `**WPM:** ${wpm}\n**Accuracy:** 100%\n**Time:** ${Math.round(timeTaken / 1000)}s`,
                        inline: true
                    },
                    {
                        name: '🎁 Rewards',
                        value: `+${coins} coins`,
                        inline: true
                    }
                ])
                .setColor(0x28A745);

            await message.reply({ embeds: [embed] });
        } else {
            // Show progress
            await message.react(accuracy > 90 ? '🟢' : accuracy > 70 ? '🟡' : '🔴');
        }
    }

    /**
     * Show memory sequence
     */
    async showMemorySequence(interaction, gameData) {
        const embed = new EmbedBuilder()
            .setTitle('🧠 Memory Challenge')
            .setDescription('Watch the sequence carefully!')
            .setColor(0x9C27B0);

        await interaction.reply({
            content: '🧠 **Memory Game!** Watch and repeat the sequence!',
            embeds: [embed]
        });

        // Show sequence step by step
        for (let i = 0; i < gameData.sequence.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const sequenceEmbed = new EmbedBuilder()
                .setTitle('🧠 Memory Challenge')
                .setDescription(`Step ${i + 1}: **${gameData.sequence[i]}**`)
                .setColor(0x9C27B0);

            await interaction.editReply({ embeds: [sequenceEmbed] });
        }

        // Now show buttons for input
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.showMemoryInput(interaction, gameData);
    }

    /**
     * Show memory input buttons
     */
    async showMemoryInput(interaction, gameData) {
        gameData.showingSequence = false;

        const embed = new EmbedBuilder()
            .setTitle('🧠 Memory Challenge')
            .setDescription(`Now repeat the sequence! Step ${gameData.currentStep + 1}/${gameData.sequence.length}`)
            .setColor(0x9C27B0);

        const row = new ActionRowBuilder();
        const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        
        for (let i = 0; i < 5; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`memory_${gameData.id}_${i + 1}`)
                    .setLabel(numbers[i])
                    .setStyle(ButtonStyle.Primary)
            );
        }

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Handle memory click
     */
    async handleMemoryClick(interaction, gameId, step) {
        const gameData = this.activeGames.get(interaction.channel.id);
        
        if (!gameData || gameData.id !== gameId || gameData.showingSequence) {
            return interaction.reply({
                content: '❌ This memory game is no longer active.',
                ephemeral: true
            });
        }

        const expectedStep = gameData.sequence[gameData.currentStep];
        
        if (step === expectedStep) {
            gameData.currentStep++;
            
            if (gameData.currentStep >= gameData.sequence.length) {
                // Completed sequence!
                this.activeGames.delete(interaction.channel.id);
                
                const coins = gameData.sequence.length * 20;
                await this.awardRewards(interaction.user.id, interaction.guild.id, coins, 'Memory game win');

                const embed = new EmbedBuilder()
                    .setTitle('🧠 Memory Master!')
                    .setDescription(`${interaction.user} completed the sequence perfectly!`)
                    .addFields([
                        {
                            name: '📊 Sequence',
                            value: gameData.sequence.join(' → '),
                            inline: false
                        },
                        {
                            name: '🎁 Rewards',
                            value: `+${coins} coins`,
                            inline: true
                        }
                    ])
                    .setColor(0x28A745);

                await interaction.update({
                    embeds: [embed],
                    components: []
                });
            } else {
                // Continue to next step
                await this.showMemoryInput(interaction, gameData);
            }
        } else {
            // Wrong step
            this.activeGames.delete(interaction.channel.id);

            const embed = new EmbedBuilder()
                .setTitle('🧠 Memory Failed!')
                .setDescription(`${interaction.user} got it wrong!`)
                .addFields([
                    {
                        name: '❌ Expected',
                        value: expectedStep.toString(),
                        inline: true
                    },
                    {
                        name: '🔴 Got',
                        value: step.toString(),
                        inline: true
                    }
                ])
                .setColor(0xDC3545);

            await interaction.update({
                embeds: [embed],
                components: []
            });
        }
    }

    /**
     * Utility methods
     */
    generateMathProblem(difficulty) {
        switch (difficulty) {
            case 'easy':
                const a = Math.floor(Math.random() * 20) + 1;
                const b = Math.floor(Math.random() * 20) + 1;
                const op = ['+', '-'][Math.floor(Math.random() * 2)];
                const answer = op === '+' ? a + b : a - b;
                return { question: `${a} ${op} ${b}`, answer };
                
            case 'medium':
                const x = Math.floor(Math.random() * 15) + 1;
                const y = Math.floor(Math.random() * 15) + 1;
                const operation = ['×', '÷'][Math.floor(Math.random() * 2)];
                if (operation === '×') {
                    return { question: `${x} × ${y}`, answer: x * y };
                } else {
                    const dividend = x * y;
                    return { question: `${dividend} ÷ ${x}`, answer: y };
                }
                
            case 'hard':
                const base = Math.floor(Math.random() * 10) + 2;
                const exp = Math.floor(Math.random() * 3) + 2;
                return { question: `${base}^${exp}`, answer: Math.pow(base, exp) };
                
            default:
                return this.generateMathProblem('medium');
        }
    }

    generateMemorySequence(length) {
        const sequence = [];
        for (let i = 0; i < length; i++) {
            sequence.push(Math.floor(Math.random() * 5) + 1);
        }
        return sequence;
    }

    calculateTypingAccuracy(original, typed) {
        if (typed.length === 0) return 0;
        
        let correct = 0;
        const minLength = Math.min(original.length, typed.length);
        
        for (let i = 0; i < minLength; i++) {
            if (original[i] === typed[i]) correct++;
        }
        
        return Math.round((correct / original.length) * 100);
    }

    calculateWPM(text, timeMs) {
        const words = text.split(' ').length;
        const minutes = timeMs / 60000;
        return Math.round(words / minutes);
    }

    getMathReward(difficulty, timeMs) {
        const baseRewards = { easy: 20, medium: 40, hard: 80 };
        const base = baseRewards[difficulty] || 40;
        const timeBonus = Math.max(0, 30 - Math.floor(timeMs / 1000));
        return base + timeBonus;
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
            await leveling.addXP(userId, guildId, 25, reason);
        }
    }

    timeoutReactionGame(gameData) {
        if (!gameData.active) return;
        this.activeGames.delete(gameData.channelId);
        // Timeout handling would go here
    }

    timeoutMathGame(gameData) {
        if (gameData.solved) return;
        this.activeGames.delete(gameData.channelId);
        // Timeout handling would go here
    }

    timeoutTypingGame(gameData) {
        if (gameData.finished) return;
        this.activeGames.delete(gameData.channelId);
        // Show final results
    }
}

module.exports = MiniGames;