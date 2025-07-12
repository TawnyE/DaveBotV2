/**
 * Daily Command - Claim daily coins
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily coins'),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.economy')) {
            return interaction.reply({
                content: '❌ Economy system is currently disabled.',
                ephemeral: true
            });
        }

        const userId = interaction.user.id;
        const now = new Date();
        
        // Get user's economy data
        let economy = await client.database.get(
            'SELECT * FROM economy WHERE user_id = ?',
            [userId]
        );

        if (!economy) {
            // Create new economy record
            const startingBalance = client.config.get('games.economy.starting_balance', 500);
            await client.database.run(
                'INSERT INTO economy (user_id, balance, total_earned) VALUES (?, ?, ?)',
                [userId, startingBalance, startingBalance]
            );
            
            economy = {
                user_id: userId,
                balance: startingBalance,
                daily_streak: 0,
                last_daily: null,
                total_earned: startingBalance,
                total_spent: 0
            };
        }

        // Check if user can claim daily
        const lastDaily = economy.last_daily ? new Date(economy.last_daily) : null;
        const timeSinceLastDaily = lastDaily ? (now.getTime() - lastDaily.getTime()) : Infinity;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (timeSinceLastDaily < oneDayMs) {
            const timeUntilNext = oneDayMs - timeSinceLastDaily;
            const hoursLeft = Math.floor(timeUntilNext / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeUntilNext % (60 * 60 * 1000)) / (60 * 1000));

            const embed = new EmbedBuilder()
                .setTitle('⏰ Daily Already Claimed')
                .setDescription(`You've already claimed your daily coins today!`)
                .addFields([
                    {
                        name: '⌛ Next Claim Available',
                        value: `**${hoursLeft}h ${minutesLeft}m**`,
                        inline: false
                    }
                ])
                .setColor(0xFFC107)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // Calculate streak
        let newStreak = 1;
        if (lastDaily) {
            const daysSinceLastDaily = timeSinceLastDaily / oneDayMs;
            if (daysSinceLastDaily <= 2) { // Allow up to 48 hours for streak
                newStreak = economy.daily_streak + 1;
            }
        }

        // Calculate daily amount with streak bonus
        const baseAmount = client.config.get('games.economy.daily_amount', 100);
        const maxStreak = client.config.get('games.economy.max_daily_streak', 30);
        const streakBonus = Math.min(newStreak - 1, maxStreak - 1) * 5; // 5 coins per streak day
        const totalAmount = baseAmount + streakBonus;

        // Update economy
        await client.database.run(
            `UPDATE economy 
             SET balance = balance + ?, 
                 daily_streak = ?, 
                 last_daily = ?, 
                 total_earned = total_earned + ? 
             WHERE user_id = ?`,
            [totalAmount, newStreak, now.toISOString(), totalAmount, userId]
        );

        const embed = new EmbedBuilder()
            .setTitle('🎁 Daily Coins Claimed!')
            .setDescription(`You've successfully claimed your daily coins!`)
            .addFields([
                {
                    name: '💰 Coins Received',
                    value: `**+${totalAmount.toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '🔥 Daily Streak',
                    value: `**${newStreak}** days`,
                    inline: true
                },
                {
                    name: '⭐ Streak Bonus',
                    value: `**+${streakBonus}** coins`,
                    inline: true
                },
                {
                    name: '💵 New Balance',
                    value: `**${(economy.balance + totalAmount).toLocaleString()}** coins`,
                    inline: false
                }
            ])
            .setColor(0x28A745)
            .setTimestamp();

        if (newStreak % 7 === 0) {
            embed.addFields([
                {
                    name: '🎉 Weekly Milestone!',
                    value: `Congratulations on your ${newStreak}-day streak!`,
                    inline: false
                }
            ]);
        }

        await interaction.reply({ embeds: [embed] });
    }
};