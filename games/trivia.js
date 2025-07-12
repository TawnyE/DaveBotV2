/**
 * Trivia Game System for DaveBot V2
 * Interactive trivia with multiple categories and scoring
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { v4: uuidv4 } = require('uuid');

class TriviaGame {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('games.trivia');
        this.activeGames = new Map();
        
        // Trivia questions database
        this.questions = {
            general: [
                {
                    question: "What is the capital of Australia?",
                    answers: ["Sydney", "Melbourne", "Canberra", "Perth"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "Which planet is known as the Red Planet?",
                    answers: ["Venus", "Mars", "Jupiter", "Saturn"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "What is the smallest prime number?",
                    answers: ["0", "1", "2", "3"],
                    correct: 2,
                    difficulty: "easy"
                }
            ],
            science: [
                {
                    question: "What is the chemical symbol for gold?",
                    answers: ["Go", "Gd", "Au", "Ag"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "How many bones are in an adult human body?",
                    answers: ["206", "208", "210", "212"],
                    correct: 0,
                    difficulty: "hard"
                }
            ],
            history: [
                {
                    question: "In which year did World War II end?",
                    answers: ["1944", "1945", "1946", "1947"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "Who was the first person to walk on the moon?",
                    answers: ["Buzz Aldrin", "Neil Armstrong", "John Glenn", "Alan Shepard"],
                    correct: 1,
                    difficulty: "easy"
                }
            ],
            sports: [
                {
                    question: "How many players are on a basketball team on the court at one time?",
                    answers: ["4", "5", "6", "7"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "Which country has won the most FIFA World Cups?",
                    answers: ["Germany", "Argentina", "Brazil", "Italy"],
                    correct: 2,
                    difficulty: "medium"
                }
            ],
            entertainment: [
                {
                    question: "Which movie won the Academy Award for Best Picture in 2020?",
                    answers: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"],
                    correct: 2,
                    difficulty: "hard"
                }
            ],
            geography: [
                {
                    question: "Which is the longest river in the world?",
                    answers: ["Amazon", "Nile", "Mississippi", "Yangtze"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "What is the smallest country in the world?",
                    answers: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
                    correct: 1,
                    difficulty: "easy"
                }
            ]
        };
    }

    /**
     * Start a new trivia game
     */
    async startGame(interaction) {
        const category = interaction.options.getString('category') || 'random';
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        const channelId = interaction.channel.id;

        // Check if there's already an active game
        if (this.activeGames.has(channelId)) {
            return interaction.reply({
                content: '❌ There is already an active trivia game in this channel!',
                ephemeral: true
            });
        }

        const question = this.getRandomQuestion(category, difficulty);
        if (!question) {
            return interaction.reply({
                content: '❌ No questions available for the selected category/difficulty.',
                ephemeral: true
            });
        }

        const gameId = uuidv4();
        const gameData = {
            id: gameId,
            channelId,
            question,
            category,
            difficulty,
            participants: new Map(),
            startTime: Date.now(),
            answered: false
        };

        this.activeGames.set(channelId, gameData);

        const embed = this.createQuestionEmbed(question, category, difficulty);
        const row = this.createAnswerButtons(question, gameId);

        await interaction.reply({
            content: '🧠 **Trivia Time!** 🧠\nFirst correct answer wins!',
            embeds: [embed],
            components: [row]
        });

        // Set timeout for the question
        setTimeout(() => {
            this.timeoutQuestion(channelId);
        }, this.config.timeout_seconds * 1000);
    }

    /**
     * Handle trivia answer
     */
    async handleAnswer(interaction, gameId, answerIndex) {
        const channelId = interaction.channel.id;
        const gameData = this.activeGames.get(channelId);

        if (!gameData || gameData.id !== gameId || gameData.answered) {
            return interaction.reply({
                content: '❌ This trivia question is no longer active.',
                ephemeral: true
            });
        }

        const isCorrect = answerIndex === gameData.question.correct;
        const userId = interaction.user.id;

        // Mark as answered
        gameData.answered = true;
        this.activeGames.delete(channelId);

        // Award points and coins
        if (isCorrect) {
            const points = this.config.points_per_correct;
            const coins = this.getDifficultyMultiplier(gameData.difficulty) * 25;

            // Update trivia stats
            await this.updateTriviaStats(userId, true, gameData.category);

            // Award economy coins
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
                await leveling.addXP(userId, interaction.guild.id, points * 10, 'Trivia correct answer');
            }

            const embed = new EmbedBuilder()
                .setTitle('🎉 Correct Answer!')
                .setDescription(`${interaction.user} got it right!`)
                .addFields([
                    {
                        name: '✅ Answer',
                        value: gameData.question.answers[gameData.question.correct],
                        inline: true
                    },
                    {
                        name: '🎁 Rewards',
                        value: `+${coins} coins\n+${points * 10} XP`,
                        inline: true
                    }
                ])
                .setColor(0x28A745)
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });
        } else {
            await this.updateTriviaStats(userId, false, gameData.category);

            const embed = new EmbedBuilder()
                .setTitle('❌ Wrong Answer!')
                .setDescription(`Sorry ${interaction.user}, that's not correct.`)
                .addFields([
                    {
                        name: '✅ Correct Answer',
                        value: gameData.question.answers[gameData.question.correct],
                        inline: true
                    },
                    {
                        name: '❌ Your Answer',
                        value: gameData.question.answers[answerIndex],
                        inline: true
                    }
                ])
                .setColor(0xDC3545)
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: []
            });
        }
    }

    /**
     * Handle button interactions
     */
    static async handleButtonInteraction(interaction, client) {
        if (!interaction.customId.startsWith('trivia_answer_')) return;

        const [, , gameId, answerIndex] = interaction.customId.split('_');
        const triviaGame = new TriviaGame(client);
        await triviaGame.handleAnswer(interaction, gameId, parseInt(answerIndex));
    }

    /**
     * Show trivia leaderboard
     */
    async showLeaderboard(interaction) {
        const leaderboard = await this.client.database.all(
            `SELECT user_id, correct_answers, total_questions, 
                    ROUND((correct_answers * 100.0 / total_questions), 1) as accuracy
             FROM trivia_stats 
             WHERE total_questions >= 5
             ORDER BY correct_answers DESC, accuracy DESC 
             LIMIT 10`
        );

        if (leaderboard.length === 0) {
            return interaction.reply({
                content: '📊 No trivia statistics available yet. Play some trivia games first!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Trivia Leaderboard')
            .setDescription('Top trivia players (minimum 5 questions)')
            .setColor(0xFFD700);

        const leaderboardText = await Promise.all(
            leaderboard.map(async (entry, index) => {
                try {
                    const user = await this.client.users.fetch(entry.user_id);
                    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                    return `${medal} **${user.username}** - ${entry.correct_answers} correct (${entry.accuracy}% accuracy)`;
                } catch {
                    return `${index + 1}. Unknown User - ${entry.correct_answers} correct (${entry.accuracy}% accuracy)`;
                }
            })
        );

        embed.addFields([
            {
                name: '📊 Rankings',
                value: leaderboardText.join('\n'),
                inline: false
            }
        ]);

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Create question embed
     */
    createQuestionEmbed(question, category, difficulty) {
        const difficultyColors = {
            easy: 0x28A745,
            medium: 0xFFC107,
            hard: 0xDC3545
        };

        return new EmbedBuilder()
            .setTitle('🧠 Trivia Question')
            .setDescription(`**${question.question}**`)
            .addFields([
                {
                    name: '📂 Category',
                    value: category.charAt(0).toUpperCase() + category.slice(1),
                    inline: true
                },
                {
                    name: '⭐ Difficulty',
                    value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
                    inline: true
                },
                {
                    name: '⏱️ Time Limit',
                    value: `${this.config.timeout_seconds} seconds`,
                    inline: true
                }
            ])
            .setColor(difficultyColors[difficulty] || 0x007BFF)
            .setTimestamp();
    }

    /**
     * Create answer buttons
     */
    createAnswerButtons(question, gameId) {
        const row = new ActionRowBuilder();
        
        question.answers.forEach((answer, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`trivia_answer_${gameId}_${index}`)
                    .setLabel(`${String.fromCharCode(65 + index)}. ${answer}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        return row;
    }

    /**
     * Get random question
     */
    getRandomQuestion(category, difficulty) {
        let questionPool = [];

        if (category === 'random') {
            // Get questions from all categories
            Object.values(this.questions).forEach(categoryQuestions => {
                questionPool.push(...categoryQuestions);
            });
        } else {
            questionPool = this.questions[category] || [];
        }

        // Filter by difficulty if specified
        if (difficulty !== 'random') {
            questionPool = questionPool.filter(q => q.difficulty === difficulty);
        }

        if (questionPool.length === 0) return null;

        return questionPool[Math.floor(Math.random() * questionPool.length)];
    }

    /**
     * Get difficulty multiplier for rewards
     */
    getDifficultyMultiplier(difficulty) {
        const multipliers = {
            easy: 1,
            medium: 1.5,
            hard: 2
        };
        return multipliers[difficulty] || 1;
    }

    /**
     * Update trivia statistics
     */
    async updateTriviaStats(userId, isCorrect, category) {
        const existing = await this.client.database.get(
            'SELECT * FROM trivia_stats WHERE user_id = ?',
            [userId]
        );

        if (existing) {
            await this.client.database.run(
                `UPDATE trivia_stats 
                 SET correct_answers = correct_answers + ?, 
                     total_questions = total_questions + 1,
                     last_played = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [isCorrect ? 1 : 0, userId]
            );
        } else {
            await this.client.database.run(
                `INSERT INTO trivia_stats (user_id, correct_answers, total_questions, last_played)
                 VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
                [userId, isCorrect ? 1 : 0]
            );
        }
    }

    /**
     * Timeout question
     */
    async timeoutQuestion(channelId) {
        const gameData = this.activeGames.get(channelId);
        if (!gameData || gameData.answered) return;

        gameData.answered = true;
        this.activeGames.delete(channelId);

        try {
            const channel = await this.client.channels.fetch(channelId);
            const embed = new EmbedBuilder()
                .setTitle('⏰ Time\'s Up!')
                .setDescription('Nobody answered in time!')
                .addFields([
                    {
                        name: '✅ Correct Answer',
                        value: gameData.question.answers[gameData.question.correct],
                        inline: false
                    }
                ])
                .setColor(0x6C757D)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            this.client.logger.error('Error sending timeout message:', error);
        }
    }
}

module.exports = TriviaGame;