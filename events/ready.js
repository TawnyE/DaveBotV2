/**
 * Ready event handler
 * Fires when the bot successfully connects to Discord
 */

const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        client.logger.info(`✅ ${client.user.tag} is now online!`);
        client.logger.info(`📊 Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);

        // Set bot activity
        const config = client.config.getAll();
        if (config.bot.activity) {
            client.user.setActivity(config.bot.activity.text, { 
                type: ActivityType[config.bot.activity.type] || ActivityType.Playing 
            });
        }

        // Set bot status
        if (config.bot.status) {
            client.user.setStatus(config.bot.status);
        }

        // Register slash commands globally
        try {
            const commands = [];
            client.commands.forEach(command => {
                commands.push(command.data.toJSON());
            });

            await client.application.commands.set(commands);
            client.logger.info(`🔄 Registered ${commands.length} global slash commands`);

        } catch (error) {
            client.logger.error('Failed to register slash commands:', error);
        }

        // Initialize cron jobs
        const CronManager = require('../systems/cron');
        const cronManager = new CronManager(client);
        cronManager.init();
        
        client.logger.info('🚀 DaveBot V2 is fully initialized and ready!');
    }
};