/**
 * Rank Command - Show user's level and XP
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Show your or another user\'s level and XP')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check rank for')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('leveling')) {
            return interaction.reply({
                content: '❌ Leveling system is currently disabled.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        const LevelingSystem = require('../../systems/leveling');
        const levelingSystem = new LevelingSystem(client);
        
        const rankData = await levelingSystem.getUserRank(targetUser.id, interaction.guild.id);
        
        if (!rankData) {
            return interaction.reply({
                content: `${targetUser.id === interaction.user.id ? 'You have' : `${targetUser.username} has`} not gained any XP yet. Send some messages to start earning XP!`,
                ephemeral: true
            });
        }

        // Create progress bar
        const progressBar = this.createProgressBar(rankData.progress_percentage);

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${targetUser.username}'s Rank`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
                {
                    name: '🏆 Server Rank',
                    value: `#${rankData.rank}`,
                    inline: true
                },
                {
                    name: '⭐ Level',
                    value: `${rankData.level}`,
                    inline: true
                },
                {
                    name: '📈 Total XP',
                    value: `${rankData.xp.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '💬 Messages Sent',
                    value: `${rankData.messages.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🎯 Progress to Next Level',
                    value: `${rankData.xp_progress}/${rankData.xp_needed} XP (${rankData.progress_percentage}%)`,
                    inline: true
                },
                {
                    name: '📊 Progress Bar',
                    value: progressBar,
                    inline: false
                }
            ])
            .setColor(0x6F42C1)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    createProgressBar(percentage) {
        const filledBlocks = Math.floor(percentage / 10);
        const emptyBlocks = 10 - filledBlocks;
        
        const filled = '█'.repeat(filledBlocks);
        const empty = '░'.repeat(emptyBlocks);
        
        return `\`${filled}${empty}\` ${percentage}%`;
    }
};