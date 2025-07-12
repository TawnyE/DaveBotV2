/**
 * Admin Dashboard Command
 * Provides interactive Discord-based configuration interface
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Access the admin dashboard (Owner/Admin only)'),

    async execute(interaction, client) {
        // Check permissions
        if (!interaction.member.permissions.has('Administrator') && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ You need Administrator permissions to access the dashboard.',
                ephemeral: true
            });
        }

        const Dashboard = require('../../systems/dashboard');
        const dashboard = new Dashboard(client);
        await dashboard.showMainDashboard(interaction);
    }
};