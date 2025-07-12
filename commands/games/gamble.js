/**
 * Gambling Command with Age Gate Protection
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gambling games (Age verification required)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('coinflip')
                .setDescription('Flip a coin and bet on the outcome')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option.setName('choice')
                        .setDescription('Choose heads or tails')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Heads', value: 'heads' },
                            { name: 'Tails', value: 'tails' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('dice')
                .setDescription('Roll dice and bet on the outcome')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Guess the number (1-6)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(6)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('slots')
                .setDescription('Play the slot machine')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.gambling')) {
            return interaction.reply({
                content: '❌ Gambling games are currently disabled.',
                ephemeral: true
            });
        }

        const AgeGate = require('../../systems/ageGate');
        const ageGate = new AgeGate(client);
        
        // Check age verification
        const accessCheck = await ageGate.canAccessGambling(interaction.user.id);
        
        if (!accessCheck.allowed) {
            if (accessCheck.reason === 'needs_verification') {
                return ageGate.showVerificationPrompt(interaction);
            } else if (accessCheck.reason === 'age_restricted') {
                const banExpires = new Date(accessCheck.banExpires);
                const embed = new EmbedBuilder()
                    .setTitle('🚫 Access Restricted')
                    .setDescription('You are currently restricted from accessing gambling features.')
                    .addFields([
                        {
                            name: '📅 Restriction Expires',
                            value: `<t:${Math.floor(banExpires.getTime() / 1000)}:F>`,
                            inline: false
                        }
                    ])
                    .setColor(0xDC3545);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        const subcommand = interaction.options.getSubcommand();
        const amount = interaction.options.getInteger('amount');
        const userId = interaction.user.id;

        // Check if user has enough balance
        const economy = await client.database.get(
            'SELECT balance FROM economy WHERE user_id = ?',
            [userId]
        );

        if (!economy || economy.balance < amount) {
            return interaction.reply({
                content: `❌ Insufficient balance! You need ${amount} coins but only have ${economy?.balance || 0} coins.`,
                ephemeral: true
            });
        }

        // Execute gambling game
        switch (subcommand) {
            case 'coinflip':
                await this.handleCoinflip(interaction, client, amount);
                break;
            case 'dice':
                await this.handleDice(interaction, client, amount);
                break;
            case 'slots':
                await this.handleSlots(interaction, client, amount);
                break;
        }
    },

    async handleCoinflip(interaction, client, amount) {
        const choice = interaction.options.getString('choice');
        const userId = interaction.user.id;
        
        // Flip the coin
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const isWin = choice === result;
        const winAmount = isWin ? amount : -amount;
        
        // Update balance
        await client.database.run(
            'UPDATE economy SET balance = balance + ?, total_spent = total_spent + ? WHERE user_id = ?',
            [winAmount, isWin ? 0 : amount, userId]
        );

        const embed = new EmbedBuilder()
            .setTitle('🪙 Coinflip Result')
            .addFields([
                {
                    name: '🎯 Your Choice',
                    value: choice.charAt(0).toUpperCase() + choice.slice(1),
                    inline: true
                },
                {
                    name: '🪙 Result',
                    value: result.charAt(0).toUpperCase() + result.slice(1),
                    inline: true
                },
                {
                    name: '💰 Outcome',
                    value: isWin ? `**+${amount}** coins` : `**-${amount}** coins`,
                    inline: true
                }
            ])
            .setColor(isWin ? 0x28A745 : 0xDC3545)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleDice(interaction, client, amount) {
        const guess = interaction.options.getInteger('number');
        const userId = interaction.user.id;
        
        // Roll the dice
        const result = Math.floor(Math.random() * 6) + 1;
        const isWin = guess === result;
        const winAmount = isWin ? amount * 5 : -amount; // 5x payout for correct guess
        
        // Update balance
        await client.database.run(
            'UPDATE economy SET balance = balance + ?, total_spent = total_spent + ? WHERE user_id = ?',
            [winAmount, isWin ? 0 : amount, userId]
        );

        const embed = new EmbedBuilder()
            .setTitle('🎲 Dice Roll Result')
            .addFields([
                {
                    name: '🎯 Your Guess',
                    value: guess.toString(),
                    inline: true
                },
                {
                    name: '🎲 Result',
                    value: result.toString(),
                    inline: true
                },
                {
                    name: '💰 Outcome',
                    value: isWin ? `**+${amount * 5}** coins` : `**-${amount}** coins`,
                    inline: true
                }
            ])
            .setColor(isWin ? 0x28A745 : 0xDC3545)
            .setFooter({ text: 'Correct guess pays 5:1!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleSlots(interaction, client, amount) {
        const userId = interaction.user.id;
        
        // Slot symbols
        const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
        
        // Generate three random symbols
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
        
        // Check for wins
        let multiplier = 0;
        let winType = '';
        
        if (reel1 === reel2 && reel2 === reel3) {
            // Three of a kind
            if (reel1 === '💎') {
                multiplier = 10; // Jackpot
                winType = 'JACKPOT! Three Diamonds!';
            } else if (reel1 === '⭐') {
                multiplier = 5; // Big win
                winType = 'Big Win! Three Stars!';
            } else {
                multiplier = 3; // Regular three of a kind
                winType = 'Three of a Kind!';
            }
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            // Two of a kind
            multiplier = 1.5;
            winType = 'Two of a Kind!';
        }
        
        const isWin = multiplier > 0;
        const winAmount = isWin ? Math.floor(amount * multiplier) - amount : -amount;
        
        // Update balance
        await client.database.run(
            'UPDATE economy SET balance = balance + ?, total_spent = total_spent + ? WHERE user_id = ?',
            [winAmount, isWin ? 0 : amount, userId]
        );

        const embed = new EmbedBuilder()
            .setTitle('🎰 Slot Machine')
            .setDescription(`\`\`\`\n┌─────────────┐\n│ ${reel1} │ ${reel2} │ ${reel3} │\n└─────────────┘\`\`\``)
            .addFields([
                {
                    name: '💰 Result',
                    value: isWin ? 
                        `**${winType}**\n+${Math.floor(amount * multiplier)} coins` : 
                        'No match - Better luck next time!',
                    inline: false
                },
                {
                    name: '📊 Outcome',
                    value: isWin ? `**+${winAmount}** coins` : `**-${amount}** coins`,
                    inline: false
                }
            ])
            .setColor(isWin ? 0x28A745 : 0xDC3545)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};