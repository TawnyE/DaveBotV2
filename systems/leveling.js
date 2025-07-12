/**
 * Leveling System for DaveBot V2
 * Handles XP tracking and level progression
 */

const { EmbedBuilder } = require('discord.js');

class LevelingSystem {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('leveling');
        this.xpCooldowns = new Map();
    }

    /**
     * Handle message for XP gain
     */
    async handleMessage(message) {
        if (!this.config.enabled) return;
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const now = Date.now();

        // Check XP cooldown
        const cooldownKey = `${userId}-${guildId}`;
        const lastXpGain = this.xpCooldowns.get(cooldownKey);
        
        if (lastXpGain && (now - lastXpGain) < (this.config.xp_cooldown_seconds * 1000)) {
            return;
        }

        // Set cooldown
        this.xpCooldowns.set(cooldownKey, now);

        // Add XP
        await this.addXP(userId, guildId, this.config.xp_per_message, 'Message sent');
    }

    /**
     * Add XP to user
     */
    async addXP(userId, guildId, amount, reason = null) {
        // Check for event multipliers
        const EventSystem = require('./eventSystem');
        const eventSystem = new EventSystem(this.client);
        const multiplier = eventSystem.getEventMultiplier(userId, 'xp');
        
        // Check for double XP boost from shop
        const EconomyShop = require('./economyShop');
        const shop = new EconomyShop(this.client);
        const hasDoubleXP = await shop.hasActiveBoost(userId, 'double_xp');
        
        const finalMultiplier = hasDoubleXP ? multiplier * 2 : multiplier;
        const finalAmount = Math.floor(amount * finalMultiplier);
        
        // Get current level data
        let levelData = await this.client.database.get(
            'SELECT * FROM levels WHERE user_id = ? AND guild_id = ?',
            [userId, guildId]
        );

        if (!levelData) {
            // Create new level record
            await this.client.database.run(
                'INSERT INTO levels (user_id, guild_id, xp, level, messages) VALUES (?, ?, ?, ?, ?)',
                [userId, guildId, finalAmount, 1, 0]
            );
            
            levelData = {
                user_id: userId,
                guild_id: guildId,
                xp: finalAmount,
                level: 1,
                messages: 0
            };
        } else {
            const newXP = levelData.xp + finalAmount;
            const newLevel = this.calculateLevel(newXP);
            const oldLevel = levelData.level;

            // Update database
            await this.client.database.run(
                `UPDATE levels 
                 SET xp = ?, level = ?, messages = messages + 1, last_xp_gain = CURRENT_TIMESTAMP 
                 WHERE user_id = ? AND guild_id = ?`,
                [newXP, newLevel, userId, guildId]
            );

            // Check for level up
            if (newLevel > oldLevel) {
                await this.handleLevelUp(userId, guildId, oldLevel, newLevel);
            }

            return { oldLevel, newLevel, xp: newXP };
        }
    }

    /**
     * Handle level up
     */
    async handleLevelUp(userId, guildId, oldLevel, newLevel) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;

            const user = await this.client.users.fetch(userId);
            if (!user) return;

            const member = await guild.members.fetch(userId);
            if (!member) return;

            // Check for role rewards
            const roleRewards = this.config.reward_roles.filter(r => r.level === newLevel);
            const rolesAdded = [];

            for (const reward of roleRewards) {
                try {
                    const role = guild.roles.cache.get(reward.role_id);
                    if (role && !member.roles.cache.has(role.id)) {
                        await member.roles.add(role);
                        rolesAdded.push(role.name);
                    }
                } catch (error) {
                    this.client.logger.error(`Failed to add role ${reward.role_id} to user ${userId}:`, error);
                }
            }

            // Create level up embed
            const embed = new EmbedBuilder()
                .setTitle('🎉 Level Up!')
                .setDescription(`${user} has reached **Level ${newLevel}**!`)
                .addFields([
                    {
                        name: '📊 Progress',
                        value: `Level ${oldLevel} ➜ Level ${newLevel}`,
                        inline: true
                    },
                    {
                        name: '✨ XP Required for Next Level',
                        value: `${this.calculateXPForLevel(newLevel + 1).toLocaleString()} XP`,
                        inline: true
                    }
                ])
                .setColor(0xFFD700)
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            if (rolesAdded.length > 0) {
                embed.addFields([
                    {
                        name: '🎁 Role Rewards',
                        value: rolesAdded.join(', '),
                        inline: false
                    }
                ]);
            }

            // Find level up channel or use system channel
            const levelUpChannel = guild.channels.cache.find(
                ch => ch.name.includes('level') || ch.name.includes('rank')
            ) || guild.systemChannel;

            if (levelUpChannel && levelUpChannel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                await levelUpChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            this.client.logger.error('Error handling level up:', error);
        }
    }

    /**
     * Calculate level from XP
     */
    calculateLevel(xp) {
        // Level formula: level = floor(sqrt(xp / 100))
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    }

    /**
     * Calculate XP required for specific level
     */
    calculateXPForLevel(level) {
        // XP formula: xp = (level - 1)^2 * 100
        return Math.pow(level - 1, 2) * 100;
    }

    /**
     * Get user's rank in guild
     */
    async getUserRank(userId, guildId) {
        const levelData = await this.client.database.get(
            'SELECT * FROM levels WHERE user_id = ? AND guild_id = ?',
            [userId, guildId]
        );

        if (!levelData) {
            return null;
        }

        // Get user's rank
        const rank = await this.client.database.get(
            `SELECT COUNT(*) + 1 as rank 
             FROM levels 
             WHERE guild_id = ? AND (xp > ? OR (xp = ? AND user_id < ?))`,
            [guildId, levelData.xp, levelData.xp, userId]
        );

        const xpForCurrentLevel = this.calculateXPForLevel(levelData.level);
        const xpForNextLevel = this.calculateXPForLevel(levelData.level + 1);
        const xpProgress = levelData.xp - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;

        return {
            ...levelData,
            rank: rank.rank,
            xp_for_current_level: xpForCurrentLevel,
            xp_for_next_level: xpForNextLevel,
            xp_progress: xpProgress,
            xp_needed: xpNeeded,
            progress_percentage: Math.round((xpProgress / xpNeeded) * 100)
        };
    }

    /**
     * Get leaderboard for guild
     */
    async getLeaderboard(guildId, limit = 10) {
        return await this.client.database.all(
            `SELECT user_id, xp, level, messages 
             FROM levels 
             WHERE guild_id = ? 
             ORDER BY xp DESC 
             LIMIT ?`,
            [guildId, limit]
        );
    }
}

module.exports = LevelingSystem;