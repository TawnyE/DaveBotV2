/**
 * Work System for DaveBot V2
 * Allows users to earn coins through various jobs
 */

const { EmbedBuilder } = require('discord.js');

class WorkSystem {
    constructor(client) {
        this.client = client;
        this.workCooldown = 3600000; // 1 hour cooldown
        
        this.jobs = {
            office: {
                name: '💼 Office Worker',
                minPay: 50,
                maxPay: 150,
                responses: [
                    'You completed your spreadsheets and earned',
                    'You attended boring meetings and got paid',
                    'You answered emails all day and received',
                    'You fixed the printer and earned',
                    'You survived another day at the office and got'
                ]
            },
            delivery: {
                name: '🍕 Pizza Delivery',
                minPay: 40,
                maxPay: 120,
                responses: [
                    'You delivered pizzas in record time and earned',
                    'You got a big tip from a happy customer:',
                    'You navigated through traffic and made',
                    'You delivered to a party and received',
                    'You worked the dinner rush and earned'
                ]
            },
            programmer: {
                name: '💻 Programmer',
                minPay: 80,
                maxPay: 200,
                responses: [
                    'You fixed a critical bug and earned',
                    'You deployed new features and received',
                    'You optimized the database and got',
                    'You wrote clean code and earned',
                    'You solved a complex algorithm and made'
                ]
            },
            artist: {
                name: '🎨 Artist',
                minPay: 30,
                maxPay: 180,
                responses: [
                    'You sold a beautiful painting and earned',
                    'You completed a commission and received',
                    'You taught an art class and made',
                    'You designed a logo and got paid',
                    'You created digital art and earned'
                ]
            },
            driver: {
                name: '🚗 Uber Driver',
                minPay: 45,
                maxPay: 130,
                responses: [
                    'You gave rides all day and earned',
                    'You got a 5-star rating and received',
                    'You worked during surge pricing and made',
                    'You helped tourists find their way and got',
                    'You drove through the city and earned'
                ]
            },
            cashier: {
                name: '🏪 Cashier',
                minPay: 35,
                maxPay: 100,
                responses: [
                    'You worked the register all day and earned',
                    'You handled difficult customers and got',
                    'You counted inventory and received',
                    'You worked the busy shift and made',
                    'You provided excellent service and earned'
                ]
            },
            entertainer: {
                name: '🎭 Entertainer',
                minPay: 25,
                maxPay: 250,
                responses: [
                    'You performed at a party and earned',
                    'You made people laugh and received',
                    'You put on a great show and got',
                    'You entertained a crowd and made',
                    'You went viral on social media and earned'
                ]
            }
        };
    }

    /**
     * Handle work command
     */
    async work(interaction) {
        const userId = interaction.user.id;
        const jobChoice = interaction.options.getString('job');

        // Check work cooldown
        const lastWork = await this.client.database.get(
            'SELECT last_work FROM economy WHERE user_id = ?',
            [userId]
        );

        if (lastWork && lastWork.last_work) {
            const timeSinceWork = Date.now() - new Date(lastWork.last_work).getTime();
            if (timeSinceWork < this.workCooldown) {
                const timeLeft = this.workCooldown - timeSinceWork;
                const minutesLeft = Math.ceil(timeLeft / 60000);
                
                return interaction.reply({
                    content: `⏰ You're tired from your last job! You can work again in **${minutesLeft} minutes**.`,
                    ephemeral: true
                });
            }
        }

        // Select random job if none specified
        const jobKeys = Object.keys(this.jobs);
        const selectedJob = jobChoice || jobKeys[Math.floor(Math.random() * jobKeys.length)];
        const job = this.jobs[selectedJob];

        if (!job) {
            return interaction.reply({
                content: '❌ Invalid job selection.',
                ephemeral: true
            });
        }

        // Calculate earnings
        const baseEarnings = Math.floor(Math.random() * (job.maxPay - job.minPay + 1)) + job.minPay;
        
        // Check for coin magnet boost
        const EconomyShop = require('./economyShop');
        const shop = new EconomyShop(this.client);
        const hasCoinMagnet = await shop.hasActiveBoost(userId, 'coin_magnet');
        
        const earnings = hasCoinMagnet ? Math.floor(baseEarnings * 1.5) : baseEarnings;
        const response = job.responses[Math.floor(Math.random() * job.responses.length)];

        // Update economy
        await this.client.database.run(
            `UPDATE economy 
             SET balance = balance + ?, 
                 total_earned = total_earned + ?, 
                 last_work = CURRENT_TIMESTAMP 
             WHERE user_id = ?`,
            [earnings, earnings, userId]
        );

        // Create work embed
        const embed = new EmbedBuilder()
            .setTitle(`${job.name} Work Complete!`)
            .setDescription(`${response} **${earnings.toLocaleString()} coins**!`)
            .setColor(0x28A745)
            .setTimestamp();

        if (hasCoinMagnet) {
            embed.addFields([
                {
                    name: '🧲 Coin Magnet Active!',
                    value: 'You found extra coins! (+50% bonus)',
                    inline: false
                }
            ]);
        }

        // Random events
        const randomEvent = Math.random();
        if (randomEvent < 0.1) { // 10% chance
            const bonusAmount = Math.floor(earnings * 0.5);
            await this.client.database.run(
                'UPDATE economy SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?',
                [bonusAmount, bonusAmount, userId]
            );
            
            embed.addFields([
                {
                    name: '🎉 Bonus Event!',
                    value: `You received an extra **${bonusAmount.toLocaleString()} coins** bonus!`,
                    inline: false
                }
            ]);
        }

        await interaction.reply({ embeds: [embed] });

        // Award XP for working
        if (this.client.config.isEnabled('leveling')) {
            const LevelingSystem = require('./leveling');
            const leveling = new LevelingSystem(this.client);
            await leveling.addXP(userId, interaction.guild.id, 25, 'Work completed');
        }
    }

    /**
     * Get work statistics for a user
     */
    async getWorkStats(userId) {
        const stats = await this.client.database.get(
            'SELECT total_earned, last_work FROM economy WHERE user_id = ?',
            [userId]
        );

        return {
            totalEarned: stats?.total_earned || 0,
            lastWork: stats?.last_work ? new Date(stats.last_work) : null,
            canWork: !stats?.last_work || (Date.now() - new Date(stats.last_work).getTime()) >= this.workCooldown
        };
    }
}

module.exports = WorkSystem;