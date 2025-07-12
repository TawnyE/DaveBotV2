/**
 * Balance Command - Show user's economy balance
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user\'s balance')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.economy')) {
            return interaction.reply({
                content: '❌ Economy system is currently disabled.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        // Get user's economy data
        let economy = await client.database.get(
            'SELECT * FROM economy WHERE user_id = ?',
            [targetUser.id]
        );

        if (!economy) {
            // Create new economy record with starting balance
            const startingBalance = client.config.get('games.economy.starting_balance', 500);
            await client.database.run(
                'INSERT INTO economy (user_id, balance, total_earned) VALUES (?, ?, ?)',
                [targetUser.id, startingBalance, startingBalance]
            );
            
            economy = {
                user_id: targetUser.id,
                balance: startingBalance,
                daily_streak: 0,
                last_daily: null,
                total_earned: startingBalance,
                total_spent: 0
            };
        }

        // Calculate daily availability
        const now = new Date();
        const lastDaily = economy.last_daily ? new Date(economy.last_daily) : null;
        const canClaimDaily = !lastDaily || 
            (now.getTime() - lastDaily.getTime()) >= (24 * 60 * 60 * 1000);

        const embed = new EmbedBuilder()
            .setTitle(`💰 ${targetUser.username}'s Balance`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
                {
                    name: '💵 Current Balance',
                    value: `**${economy.balance.toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '🔥 Daily Streak',
                    value: `**${economy.daily_streak}** days`,
                    inline: true
                },
                {
                    name: '📅 Daily Claim',
                    value: canClaimDaily ? '✅ **Available**' : '❌ **Used**',
                    inline: true
                },
                {
                    name: '📈 Total Earned',
                    value: `${economy.total_earned.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📉 Total Spent',
                    value: `${economy.total_spent.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📊 Net Worth',
                    value: `${(economy.total_earned - economy.total_spent).toLocaleString()} coins`,
                    inline: true
                }
            ])
            .setColor(0x28A745)
            .setTimestamp();

        if (targetUser.id === interaction.user.id && canClaimDaily) {
            embed.setFooter({ text: 'Use /daily to claim your daily coins!' });
        }

        await interaction.reply({ embeds: [embed] });
    }
};