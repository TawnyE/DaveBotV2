/**
 * Event System for DaveBot V2
 * Manages server events, competitions, and special activities
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');

class EventSystem {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('events');
        this.activeEvents = new Map();
        this.scheduledJobs = new Map();
        
        this.eventTypes = {
            double_xp: {
                name: '⚡ Double XP Event',
                description: 'Earn double XP from all activities!',
                duration: 3600000, // 1 hour
                multiplier: 2
            },
            coin_rain: {
                name: '💰 Coin Rain',
                description: 'Extra coins from all activities!',
                duration: 1800000, // 30 minutes
                multiplier: 1.5
            },
            trivia_night: {
                name: '🧠 Trivia Night',
                description: 'Special trivia competition with big prizes!',
                duration: 7200000, // 2 hours
                prizes: [1000, 500, 250]
            },
            game_tournament: {
                name: '🏆 Game Tournament',
                description: 'Compete in various mini-games!',
                duration: 10800000, // 3 hours
                prizes: [2000, 1000, 500]
            },
            lucky_hour: {
                name: '🍀 Lucky Hour',
                description: 'Increased gambling win rates!',
                duration: 3600000, // 1 hour
                luckMultiplier: 1.3
            }
        };

        this.initializeScheduledEvents();
    }

    /**
     * Initialize scheduled events
     */
    initializeScheduledEvents() {
        if (!this.config.auto_events) return;

        // Random events every 30 minutes to 2 hours
        const randomEventJob = cron.schedule('*/30 * * * *', () => {
            if (Math.random() < 0.3) { // 30% chance every 30 minutes
                this.triggerRandomEvent();
            }
        }, { scheduled: false });

        this.scheduledJobs.set('random_events', randomEventJob);
        randomEventJob.start();

        // Scheduled events from config
        if (this.config.scheduled_events) {
            this.config.scheduled_events.forEach(event => {
                if (!event.enabled) return;

                const cronPattern = this.createCronPattern(event);
                const job = cron.schedule(cronPattern, () => {
                    this.triggerScheduledEvent(event);
                }, { scheduled: false });

                this.scheduledJobs.set(event.name, job);
                job.start();
            });
        }
    }

    /**
     * Trigger random event
     */
    async triggerRandomEvent() {
        const eventTypes = Object.keys(this.eventTypes);
        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        await this.startEvent(randomType, null, true);
    }

    /**
     * Trigger scheduled event
     */
    async triggerScheduledEvent(eventConfig) {
        await this.startEvent(eventConfig.type, null, true);
    }

    /**
     * Start an event
     */
    async startEvent(eventType, guildId = null, isAutomatic = false) {
        const eventData = this.eventTypes[eventType];
        if (!eventData) return;

        const eventId = `${eventType}_${Date.now()}`;
        const event = {
            id: eventId,
            type: eventType,
            name: eventData.name,
            description: eventData.description,
            startTime: Date.now(),
            endTime: Date.now() + eventData.duration,
            participants: new Map(),
            scores: new Map(),
            isActive: true,
            isAutomatic,
            guildId
        };

        this.activeEvents.set(eventId, event);

        // Announce event
        await this.announceEvent(event);

        // Set end timer
        setTimeout(() => {
            this.endEvent(eventId);
        }, eventData.duration);

        return eventId;
    }

    /**
     * Announce event to all guilds or specific guild
     */
    async announceEvent(event) {
        const embed = new EmbedBuilder()
            .setTitle(`🎉 ${event.name} Started!`)
            .setDescription(event.description)
            .addFields([
                {
                    name: '⏰ Duration',
                    value: this.formatDuration(event.endTime - event.startTime),
                    inline: true
                },
                {
                    name: '🎯 How to Participate',
                    value: 'Just play games and be active!',
                    inline: true
                }
            ])
            .setColor(0xFF6B35)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`event_join_${event.id}`)
                    .setLabel('🎊 Join Event')
                    .setStyle(ButtonStyle.Primary)
            );

        // Send to event channels or general channels
        const guilds = event.guildId ? 
            [this.client.guilds.cache.get(event.guildId)] : 
            this.client.guilds.cache.values();

        for (const guild of guilds) {
            if (!guild) continue;

            try {
                const eventChannels = this.config.event_channels || [];
                let targetChannel = null;

                // Find event channel
                for (const channelId of eventChannels) {
                    targetChannel = guild.channels.cache.get(channelId);
                    if (targetChannel) break;
                }

                // Fallback to system channel or general
                if (!targetChannel) {
                    targetChannel = guild.systemChannel || 
                        guild.channels.cache.find(ch => 
                            ch.name.includes('general') || 
                            ch.name.includes('event') ||
                            ch.name.includes('announcement')
                        );
                }

                if (targetChannel && targetChannel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    await targetChannel.send({
                        content: '@everyone',
                        embeds: [embed],
                        components: [row]
                    });
                }
            } catch (error) {
                this.client.logger.error(`Error announcing event in guild ${guild.id}:`, error);
            }
        }
    }

    /**
     * End an event
     */
    async endEvent(eventId) {
        const event = this.activeEvents.get(eventId);
        if (!event) return;

        event.isActive = false;

        // Calculate winners
        const winners = this.calculateWinners(event);

        // Award prizes
        await this.awardEventPrizes(event, winners);

        // Announce results
        await this.announceEventResults(event, winners);

        // Clean up
        this.activeEvents.delete(eventId);
    }

    /**
     * Show current events
     */
    async showCurrentEvents(interaction) {
        const currentEvents = Array.from(this.activeEvents.values())
            .filter(event => event.isActive);

        if (currentEvents.length === 0) {
            return interaction.reply({
                content: '📅 No events are currently active. Check back later!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎉 Current Active Events')
            .setDescription('Join these events to earn special rewards!')
            .setColor(0xFF6B35);

        currentEvents.forEach(event => {
            const timeLeft = event.endTime - Date.now();
            const participantCount = event.participants.size;

            embed.addFields([
                {
                    name: event.name,
                    value: `${event.description}\n⏰ **${this.formatDuration(timeLeft)}** left\n👥 **${participantCount}** participants`,
                    inline: false
                }
            ]);
        });

        const row = new ActionRowBuilder();
        currentEvents.slice(0, 5).forEach(event => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`event_join_${event.id}`)
                    .setLabel(`Join ${event.name.split(' ')[1] || 'Event'}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        await interaction.reply({
            embeds: [embed],
            components: row.components.length > 0 ? [row] : []
        });
    }

    /**
     * Join an event
     */
    async joinEvent(interaction) {
        const eventName = interaction.options.getString('event');
        const userId = interaction.user.id;

        // Find event by name or ID
        const event = Array.from(this.activeEvents.values())
            .find(e => e.isActive && (e.name.toLowerCase().includes(eventName.toLowerCase()) || e.id === eventName));

        if (!event) {
            return interaction.reply({
                content: '❌ Event not found or no longer active.',
                ephemeral: true
            });
        }

        if (event.participants.has(userId)) {
            return interaction.reply({
                content: '✅ You are already participating in this event!',
                ephemeral: true
            });
        }

        // Add participant
        event.participants.set(userId, {
            joinTime: Date.now(),
            score: 0,
            user: interaction.user
        });

        const embed = new EmbedBuilder()
            .setTitle('🎊 Event Joined!')
            .setDescription(`You have successfully joined **${event.name}**!`)
            .addFields([
                {
                    name: '⏰ Time Remaining',
                    value: this.formatDuration(event.endTime - Date.now()),
                    inline: true
                },
                {
                    name: '👥 Total Participants',
                    value: event.participants.size.toString(),
                    inline: true
                }
            ])
            .setColor(0x28A745);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle event button interactions
     */
    async handleEventInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('event_join_')) {
            const eventId = customId.split('_')[2];
            const event = this.activeEvents.get(eventId);
            
            if (!event || !event.isActive) {
                return interaction.reply({
                    content: '❌ This event is no longer active.',
                    ephemeral: true
                });
            }

            const userId = interaction.user.id;
            
            if (event.participants.has(userId)) {
                return interaction.reply({
                    content: '✅ You are already participating in this event!',
                    ephemeral: true
                });
            }

            event.participants.set(userId, {
                joinTime: Date.now(),
                score: 0,
                user: interaction.user
            });

            await interaction.reply({
                content: `🎊 You joined **${event.name}**! Start playing games to earn points!`,
                ephemeral: true
            });
        }
    }

    /**
     * Add score to event participant
     */
    async addEventScore(userId, guildId, points, activity) {
        const userEvents = Array.from(this.activeEvents.values())
            .filter(event => event.isActive && event.participants.has(userId));

        for (const event of userEvents) {
            const participant = event.participants.get(userId);
            participant.score += points;
            
            // Apply event multipliers
            const eventData = this.eventTypes[event.type];
            if (eventData.multiplier && activity === 'xp') {
                // This would be handled by the leveling system
                return eventData.multiplier;
            }
        }

        return 1; // No multiplier
    }

    /**
     * Show event leaderboard
     */
    async showLeaderboard(interaction) {
        const eventName = interaction.options.getString('event');
        
        let event = null;
        if (eventName) {
            event = Array.from(this.activeEvents.values())
                .find(e => e.name.toLowerCase().includes(eventName.toLowerCase()));
        } else {
            // Show most recent active event
            const activeEvents = Array.from(this.activeEvents.values())
                .filter(e => e.isActive);
            event = activeEvents[activeEvents.length - 1];
        }

        if (!event) {
            return interaction.reply({
                content: '❌ No active events found.',
                ephemeral: true
            });
        }

        const participants = Array.from(event.participants.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        if (participants.length === 0) {
            return interaction.reply({
                content: '📊 No participants in this event yet.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${event.name} Leaderboard`)
            .setDescription('Top participants in the current event')
            .setColor(0xFFD700);

        const leaderboardText = participants.map((participant, index) => {
            const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
            return `${medal} **${participant.user.username}** - ${participant.score} points`;
        }).join('\n');

        embed.addFields([
            {
                name: '📊 Rankings',
                value: leaderboardText,
                inline: false
            }
        ]);

        if (event.isActive) {
            embed.addFields([
                {
                    name: '⏰ Time Remaining',
                    value: this.formatDuration(event.endTime - Date.now()),
                    inline: true
                }
            ]);
        }

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Show event schedule
     */
    async showSchedule(interaction) {
        const scheduledEvents = this.config.scheduled_events || [];
        
        if (scheduledEvents.length === 0) {
            return interaction.reply({
                content: '📅 No scheduled events configured.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 Event Schedule')
            .setDescription('Upcoming scheduled events')
            .setColor(0x6F42C1);

        scheduledEvents.forEach(event => {
            if (!event.enabled) return;

            const status = event.enabled ? '✅ Active' : '❌ Disabled';
            const schedule = event.days ? 
                `${event.days.join(', ')} at ${event.time}` : 
                `Daily at ${event.time}`;

            embed.addFields([
                {
                    name: event.name,
                    value: `**Type:** ${event.type}\n**Schedule:** ${schedule}\n**Status:** ${status}`,
                    inline: true
                }
            ]);
        });

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Calculate event winners
     */
    calculateWinners(event) {
        const participants = Array.from(event.participants.values())
            .sort((a, b) => b.score - a.score);

        return participants.slice(0, 3); // Top 3 winners
    }

    /**
     * Award event prizes
     */
    async awardEventPrizes(event, winners) {
        const eventData = this.eventTypes[event.type];
        const prizes = eventData.prizes || [500, 250, 100];

        for (let i = 0; i < Math.min(winners.length, prizes.length); i++) {
            const winner = winners[i];
            const prize = prizes[i];

            try {
                // Award coins
                await this.client.database.run(
                    'UPDATE economy SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?',
                    [prize, prize, winner.user.id]
                );

                // Award XP
                if (this.client.config.isEnabled('leveling')) {
                    const LevelingSystem = require('./leveling');
                    const leveling = new LevelingSystem(this.client);
                    await leveling.addXP(winner.user.id, null, prize / 2, `${event.name} winner`);
                }
            } catch (error) {
                this.client.logger.error('Error awarding event prize:', error);
            }
        }
    }

    /**
     * Announce event results
     */
    async announceEventResults(event, winners) {
        if (winners.length === 0) return;

        const embed = new EmbedBuilder()
            .setTitle(`🏁 ${event.name} Results`)
            .setDescription('Congratulations to our winners!')
            .setColor(0xFFD700);

        const winnerText = winners.map((winner, index) => {
            const medal = ['🥇', '🥈', '🥉'][index];
            const eventData = this.eventTypes[event.type];
            const prize = eventData.prizes ? eventData.prizes[index] : 0;
            return `${medal} **${winner.user.username}** - ${winner.score} points (${prize} coins)`;
        }).join('\n');

        embed.addFields([
            {
                name: '🏆 Winners',
                value: winnerText,
                inline: false
            },
            {
                name: '📊 Event Stats',
                value: `**Participants:** ${event.participants.size}\n**Duration:** ${this.formatDuration(event.endTime - event.startTime)}`,
                inline: false
            }
        ]);

        // Announce to same channels as event start
        const guilds = event.guildId ? 
            [this.client.guilds.cache.get(event.guildId)] : 
            this.client.guilds.cache.values();

        for (const guild of guilds) {
            if (!guild) continue;

            try {
                const eventChannels = this.config.event_channels || [];
                let targetChannel = null;

                for (const channelId of eventChannels) {
                    targetChannel = guild.channels.cache.get(channelId);
                    if (targetChannel) break;
                }

                if (!targetChannel) {
                    targetChannel = guild.systemChannel || 
                        guild.channels.cache.find(ch => ch.name.includes('general'));
                }

                if (targetChannel && targetChannel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    await targetChannel.send({ embeds: [embed] });
                }
            } catch (error) {
                this.client.logger.error(`Error announcing event results in guild ${guild.id}:`, error);
            }
        }
    }

    /**
     * Utility methods
     */
    createCronPattern(event) {
        const [hour, minute] = event.time.split(':');
        
        if (event.days) {
            const dayNumbers = event.days.map(day => {
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                return days.indexOf(day.toLowerCase());
            }).join(',');
            return `${minute} ${hour} * * ${dayNumbers}`;
        } else {
            return `${minute} ${hour} * * *`; // Daily
        }
    }

    formatDuration(ms) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Check if user has event multiplier
     */
    getEventMultiplier(userId, type) {
        const userEvents = Array.from(this.activeEvents.values())
            .filter(event => event.isActive && event.participants.has(userId));

        for (const event of userEvents) {
            const eventData = this.eventTypes[event.type];
            if (type === 'xp' && eventData.multiplier) {
                return eventData.multiplier;
            }
            if (type === 'coins' && eventData.multiplier) {
                return eventData.multiplier;
            }
            if (type === 'luck' && eventData.luckMultiplier) {
                return eventData.luckMultiplier;
            }
        }

        return 1; // No multiplier
    }
}

module.exports = EventSystem;