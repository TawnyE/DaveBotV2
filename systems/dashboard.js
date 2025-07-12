/**
 * Dashboard System for DaveBot V2
 * Interactive Discord-based admin configuration interface
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

class Dashboard {
    constructor(client) {
        this.client = client;
    }

    /**
     * Show main dashboard
     */
    async showMainDashboard(interaction) {
        const config = this.client.config.getAll();
        
        const embed = new EmbedBuilder()
            .setTitle('🛠️ DaveBot V2 Dashboard')
            .setDescription('Welcome to the DaveBot V2 administration dashboard. Use the menu below to configure different aspects of the bot.')
            .addFields([
                {
                    name: '🎮 Games Status',
                    value: config.games.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '🔞 Age Gate',
                    value: config.age_gate.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '📊 Leveling',
                    value: config.leveling.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '🎫 Tickets',
                    value: config.tickets.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '🔨 Moderation',
                    value: config.moderation.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '🔧 Utilities',
                    value: `MC: ${config.utility.minecraft_checker ? '✅' : '❌'} | BD: ${config.utility.birthday_reminders ? '✅' : '❌'}`,
                    inline: true
                }
            ])
            .setColor(0x007BFF)
            .setTimestamp()
            .setFooter({ text: 'DaveBot V2 Administration Dashboard' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('dashboard_nav')
            .setPlaceholder('Choose a configuration category')
            .addOptions([
                {
                    label: '🎮 Games Configuration',
                    description: 'Configure games, economy, and gambling settings',
                    value: 'games'
                },
                {
                    label: '🔞 Age Gate Settings',
                    description: 'Manage age verification and restrictions',
                    value: 'age_gate'
                },
                {
                    label: '📊 Leveling System',
                    description: 'Configure XP, levels, and role rewards',
                    value: 'leveling'
                },
                {
                    label: '🎫 Ticket System',
                    description: 'Setup support tickets and categories',
                    value: 'tickets'
                },
                {
                    label: '🔨 Moderation Tools',
                    description: 'Configure moderation settings and logging',
                    value: 'moderation'
                },
                {
                    label: '🔧 Utility Features',
                    description: 'Enable/disable utility features',
                    value: 'utility'
                }
            ]);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_save')
                    .setLabel('💾 Save Config')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dashboard_backup')
                    .setLabel('📁 Backup')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            ephemeral: true
        });
    }

    /**
     * Handle navigation selection
     */
    async handleNavigation(interaction) {
        const category = interaction.values[0];
        
        switch (category) {
            case 'games':
                await this.showGamesConfig(interaction);
                break;
            case 'age_gate':
                await this.showAgeGateConfig(interaction);
                break;
            case 'leveling':
                await this.showLevelingConfig(interaction);
                break;
            case 'tickets':
                await this.showTicketsConfig(interaction);
                break;
            case 'moderation':
                await this.showModerationConfig(interaction);
                break;
            case 'utility':
                await this.showUtilityConfig(interaction);
                break;
        }
    }

    /**
     * Show games configuration
     */
    async showGamesConfig(interaction) {
        const config = this.client.config.get('games');
        
        const embed = new EmbedBuilder()
            .setTitle('🎮 Games Configuration')
            .setDescription('Configure game features and economy settings')
            .addFields([
                {
                    name: '🎮 Games Module',
                    value: config.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '🎰 Gambling',
                    value: config.gambling ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '🎯 Hangman',
                    value: config.hangman.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '💰 Economy',
                    value: config.economy.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '💵 Daily Amount',
                    value: `${config.economy.daily_amount} coins`,
                    inline: true
                },
                {
                    name: '🏦 Starting Balance',
                    value: `${config.economy.starting_balance} coins`,
                    inline: true
                }
            ])
            .setColor(0x28A745);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_toggle_games')
                    .setLabel(config.enabled ? 'Disable Games' : 'Enable Games')
                    .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dashboard_toggle_gambling')
                    .setLabel(config.gambling ? 'Disable Gambling' : 'Enable Gambling')
                    .setStyle(config.gambling ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dashboard_config_economy')
                    .setLabel('⚙️ Economy Settings')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_back')
                    .setLabel('🔙 Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Show age gate configuration
     */
    async showAgeGateConfig(interaction) {
        const config = this.client.config.get('age_gate');
        
        const embed = new EmbedBuilder()
            .setTitle('🔞 Age Gate Configuration')
            .setDescription('Manage age verification settings for gambling features')
            .addFields([
                {
                    name: '🔞 Age Gate',
                    value: config.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '📅 Minimum Age',
                    value: `${config.min_age} years`,
                    inline: true
                },
                {
                    name: '⏰ Reverify After',
                    value: `${config.reverify_after_days} days`,
                    inline: true
                },
                {
                    name: '🚫 Ban Duration',
                    value: `${config.ban_duration_days} days`,
                    inline: true
                }
            ])
            .setColor(0xFF6B35);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_toggle_age_gate')
                    .setLabel(config.enabled ? 'Disable Age Gate' : 'Enable Age Gate')
                    .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dashboard_config_age_settings')
                    .setLabel('⚙️ Age Settings')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_view_verifications')
                    .setLabel('👥 View Verifications')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_back')
                    .setLabel('🔙 Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Show leveling configuration
     */
    async showLevelingConfig(interaction) {
        const config = this.client.config.get('leveling');
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Leveling Configuration')
            .setDescription('Configure XP system and level rewards')
            .addFields([
                {
                    name: '📊 Leveling System',
                    value: config.enabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '✨ XP per Message',
                    value: `${config.xp_per_message} XP`,
                    inline: true
                },
                {
                    name: '⏱️ XP Cooldown',
                    value: `${config.xp_cooldown_seconds} seconds`,
                    inline: true
                },
                {
                    name: '🎁 Role Rewards',
                    value: config.reward_roles.length > 0 ? 
                        config.reward_roles.map(r => `Level ${r.level}: <@&${r.role_id}>`).join('\n') : 
                        'No role rewards configured',
                    inline: false
                }
            ])
            .setColor(0x6F42C1);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_toggle_leveling')
                    .setLabel(config.enabled ? 'Disable Leveling' : 'Enable Leveling')
                    .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dashboard_config_xp')
                    .setLabel('⚙️ XP Settings')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_config_role_rewards')
                    .setLabel('🎁 Role Rewards')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_back')
                    .setLabel('🔙 Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Handle button interactions
     */
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'dashboard_back') {
            await this.showMainDashboard(interaction);
            return;
        }
        
        if (customId === 'dashboard_refresh') {
            await this.showMainDashboard(interaction);
            return;
        }
        
        if (customId === 'dashboard_save') {
            await this.saveConfiguration(interaction);
            return;
        }

        // Handle toggle buttons
        if (customId.startsWith('dashboard_toggle_')) {
            await this.handleToggle(interaction, customId);
            return;
        }

        // Handle configuration modals
        if (customId.startsWith('dashboard_config_')) {
            await this.showConfigModal(interaction, customId);
            return;
        }
    }

    /**
     * Handle toggle actions
     */
    async handleToggle(interaction, customId) {
        const toggleType = customId.replace('dashboard_toggle_', '');
        const config = this.client.config;

        switch (toggleType) {
            case 'games':
                config.set('games.enabled', !config.get('games.enabled'));
                await this.showGamesConfig(interaction);
                break;
            case 'gambling':
                config.set('games.gambling', !config.get('games.gambling'));
                await this.showGamesConfig(interaction);
                break;
            case 'age_gate':
                config.set('age_gate.enabled', !config.get('age_gate.enabled'));
                await this.showAgeGateConfig(interaction);
                break;
            case 'leveling':
                config.set('leveling.enabled', !config.get('leveling.enabled'));
                await this.showLevelingConfig(interaction);
                break;
        }
    }

    /**
     * Show configuration modal
     */
    async showConfigModal(interaction, customId) {
        const configType = customId.replace('dashboard_config_', '');
        
        if (configType === 'economy') {
            const modal = new ModalBuilder()
                .setCustomId('dashboard_config_economy_modal')
                .setTitle('Economy Configuration');

            const dailyAmount = new TextInputBuilder()
                .setCustomId('daily_amount')
                .setLabel('Daily Amount')
                .setStyle(TextInputStyle.Short)
                .setValue(this.client.config.get('games.economy.daily_amount').toString())
                .setRequired(true);

            const startingBalance = new TextInputBuilder()
                .setCustomId('starting_balance')
                .setLabel('Starting Balance')
                .setStyle(TextInputStyle.Short)
                .setValue(this.client.config.get('games.economy.starting_balance').toString())
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(dailyAmount),
                new ActionRowBuilder().addComponents(startingBalance)
            );

            await interaction.showModal(modal);
        }
    }

    /**
     * Handle configuration modal submission
     */
    async handleConfigModal(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'dashboard_config_economy_modal') {
            const dailyAmount = parseInt(interaction.fields.getTextInputValue('daily_amount'));
            const startingBalance = parseInt(interaction.fields.getTextInputValue('starting_balance'));

            if (isNaN(dailyAmount) || isNaN(startingBalance) || dailyAmount < 1 || startingBalance < 1) {
                return interaction.reply({
                    content: '❌ Invalid values provided. Please enter positive numbers.',
                    ephemeral: true
                });
            }

            this.client.config.set('games.economy.daily_amount', dailyAmount);
            this.client.config.set('games.economy.starting_balance', startingBalance);

            await interaction.reply({
                content: '✅ Economy settings updated successfully!',
                ephemeral: true
            });
        }
    }

    /**
     * Save configuration to file
     */
    async saveConfiguration(interaction) {
        try {
            await this.client.config.save();
            
            await interaction.reply({
                content: '✅ Configuration saved successfully!',
                ephemeral: true
            });
        } catch (error) {
            this.client.logger.error('Failed to save configuration:', error);
            
            await interaction.reply({
                content: '❌ Failed to save configuration. Check console for details.',
                ephemeral: true
            });
        }
    }
}

module.exports = Dashboard;