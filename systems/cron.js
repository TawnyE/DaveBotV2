/**
 * Cron Job Manager for DaveBot V2
 * Handles scheduled tasks like birthday reminders
 */

const cron = require('node-cron');

class CronManager {
    constructor(client) {
        this.client = client;
        this.jobs = new Map();
    }

    /**
     * Initialize all cron jobs
     */
    init() {
        this.client.logger.info('🕐 Initializing cron jobs...');
        
        // Birthday reminders - runs daily at 9 AM
        if (this.client.config.get('utility.birthday_reminders')) {
            this.scheduleBirthdayReminders();
        }

        // Daily economy reset - runs at midnight
        if (this.client.config.isEnabled('games.economy')) {
            this.scheduleEconomyReset();
        }

        // Database cleanup - runs weekly
        this.scheduleDatabaseCleanup();

        this.client.logger.info(`✅ Initialized ${this.jobs.size} cron jobs`);
    }

    /**
     * Schedule birthday reminders
     */
    scheduleBirthdayReminders() {
        const job = cron.schedule('0 9 * * *', async () => {
            try {
                await this.checkBirthdays();
            } catch (error) {
                this.client.logger.error('Error in birthday cron job:', error);
            }
        }, { scheduled: false });

        this.jobs.set('birthdays', job);
        job.start();
        
        this.client.logger.debug('📅 Birthday reminder cron job scheduled');
    }

    /**
     * Schedule economy reset
     */
    scheduleEconomyReset() {
        const job = cron.schedule('0 0 * * *', async () => {
            try {
                await this.resetDailyEconomy();
            } catch (error) {
                this.client.logger.error('Error in economy reset cron job:', error);
            }
        }, { scheduled: false });

        this.jobs.set('economy_reset', job);
        job.start();
        
        this.client.logger.debug('💰 Economy reset cron job scheduled');
    }

    /**
     * Schedule database cleanup
     */
    scheduleDatabaseCleanup() {
        const job = cron.schedule('0 2 * * 0', async () => {
            try {
                await this.cleanupDatabase();
            } catch (error) {
                this.client.logger.error('Error in database cleanup cron job:', error);
            }
        }, { scheduled: false });

        this.jobs.set('database_cleanup', job);
        job.start();
        
        this.client.logger.debug('🧹 Database cleanup cron job scheduled');
    }

    /**
     * Check for birthdays and send reminders
     */
    async checkBirthdays() {
        const today = new Date();
        const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const birthdays = await this.client.database.all(
            `SELECT user_id, birthday FROM birthdays 
             WHERE strftime('%m-%d', birthday) = ? AND notify = 1`,
            [todayString]
        );

        if (birthdays.length === 0) return;

        this.client.logger.info(`🎂 Found ${birthdays.length} birthdays today`);

        for (const birthday of birthdays) {
            try {
                const user = await this.client.users.fetch(birthday.user_id);
                if (!user) continue;

                // Send birthday message to all guilds the user is in
                for (const guild of this.client.guilds.cache.values()) {
                    try {
                        const member = await guild.members.fetch(birthday.user_id);
                        if (!member) continue;

                        const birthdayChannel = guild.channels.cache.find(
                            ch => ch.name.includes('birthday') || ch.name.includes('celebration')
                        ) || guild.systemChannel;

                        if (birthdayChannel && birthdayChannel.permissionsFor(guild.members.me).has('SendMessages')) {
                            await birthdayChannel.send({
                                content: `🎉 **Happy Birthday** ${member}! 🎂\n\nWishing you a wonderful day filled with joy and celebration! 🎈`
                            });
                        }
                    } catch (error) {
                        this.client.logger.debug(`Could not send birthday message in guild ${guild.id}:`, error.message);
                    }
                }
            } catch (error) {
                this.client.logger.error(`Error processing birthday for user ${birthday.user_id}:`, error);
            }
        }
    }

    /**
     * Reset daily economy limits
     */
    async resetDailyEconomy() {
        this.client.logger.info('💰 Performing daily economy reset...');
        
        // Reset daily streak for users who missed their daily claim
        const oneDayAgo = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours grace period
        
        await this.client.database.run(
            'UPDATE economy SET daily_streak = 0 WHERE last_daily IS NOT NULL AND last_daily < ?',
            [oneDayAgo.toISOString()]
        );

        this.client.logger.info('✅ Daily economy reset completed');
    }

    /**
     * Clean up old database records
     */
    async cleanupDatabase() {
        this.client.logger.info('🧹 Performing database cleanup...');
        
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Clean up old completed hangman games
        await this.client.database.run(
            'DELETE FROM hangman_games WHERE status != "active" AND created_at < ?',
            [oneWeekAgo.toISOString()]
        );

        // Clean up old moderation logs
        await this.client.database.run(
            'DELETE FROM moderation_logs WHERE created_at < ? AND (expires_at IS NULL OR expires_at < ?)',
            [oneMonthAgo.toISOString(), new Date().toISOString()]
        );

        // Clean up old closed tickets
        await this.client.database.run(
            'DELETE FROM tickets WHERE status = "closed" AND closed_at < ?',
            [oneWeekAgo.toISOString()]
        );

        this.client.logger.info('✅ Database cleanup completed');
    }

    /**
     * Stop all cron jobs
     */
    stopAll() {
        for (const [name, job] of this.jobs) {
            job.stop();
            this.client.logger.debug(`Stopped cron job: ${name}`);
        }
        this.jobs.clear();
    }

    /**
     * Stop specific cron job
     */
    stop(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.stop();
            this.jobs.delete(name);
            this.client.logger.debug(`Stopped cron job: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Get status of all jobs
     */
    getStatus() {
        const status = {};
        for (const [name, job] of this.jobs) {
            status[name] = job.running;
        }
        return status;
    }
}

module.exports = CronManager;