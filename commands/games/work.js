/**
 * Work Command - Earn coins through various jobs
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn coins')
        .addStringOption(option =>
            option.setName('job')
                .setDescription('Choose your job')
                .setRequired(false)
                .addChoices(
                    { name: '💼 Office Worker', value: 'office' },
                    { name: '🍕 Pizza Delivery', value: 'delivery' },
                    { name: '💻 Programmer', value: 'programmer' },
                    { name: '🎨 Artist', value: 'artist' },
                    { name: '🚗 Uber Driver', value: 'driver' },
                    { name: '🏪 Cashier', value: 'cashier' },
                    { name: '🎭 Entertainer', value: 'entertainer' }
                )
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.economy.work_enabled')) {
            return interaction.reply({
                content: '❌ Work system is currently disabled.',
                ephemeral: true
            });
        }

        const WorkSystem = require('../../systems/workSystem');
        const workSystem = new WorkSystem(client);
        await workSystem.work(interaction);
    }
};