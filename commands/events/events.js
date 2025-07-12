/**
 * Events Command - Manage and participate in server events
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('events')
        .setDescription('Server events and activities')
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .setDescription('Show current active events')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an active event')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('Event to join')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Show event leaderboards')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('Event leaderboard to view')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('View upcoming scheduled events')
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('events')) {
            return interaction.reply({
                content: '❌ Events system is currently disabled.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const EventSystem = require('../../systems/eventSystem');
        const eventSystem = new EventSystem(client);

        switch (subcommand) {
            case 'current':
                await eventSystem.showCurrentEvents(interaction);
                break;
            case 'join':
                await eventSystem.joinEvent(interaction);
                break;
            case 'leaderboard':
                await eventSystem.showLeaderboard(interaction);
                break;
            case 'schedule':
                await eventSystem.showSchedule(interaction);
                break;
        }
    }
};