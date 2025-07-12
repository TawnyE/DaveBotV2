/**
 * Help System for DaveBot V2
 * Interactive help interface with categorized commands
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class HelpSystem {
    constructor(client) {
        this.client = client;
        this.categories = {
            games: {
                name: '🎮 Games',
                description: 'Fun games and entertainment features',
                commands: [
                    { name: '/hangman', description: 'Play a game of hangman with friends' },
                    { name: '/balance', description: 'Check your coin balance' },
                    { name: '/daily', description: 'Claim your daily coins' },
                    { name: '/gamble', description: 'Gambling games (age verification required)' }
                ]
            },
            admin: {
                name: '👑 Administration',
                description: 'Server management and configuration',
                commands: [
                    { name: '/dashboard', description: 'Access the admin configuration dashboard' },
                    { name: '/admin punish', description: 'Punish a user with logging' },
                    { name: '/admin timeout', description: 'Timeout a user' },
                    { name: '/admin forgive', description: 'Remove punishment from a user' }
                ]
            },
            utility: {
                name: '🔧 Utility',
                description: 'Helpful tools and information',
                commands: [
                    { name: '/help', description: 'Show this help menu' },
                    { name: '/mc status', description: 'Check Minecraft server status' },
                    { name: '/birthday set', description: 'Set your birthday for reminders' },
                    { name: '/serverinfo', description: 'Show server information' },
                    { name: '/rank', description: 'Show your level and XP' }
                ]
            },
            tickets: {
                name: '🎫 Support',
                description: 'Support ticket system',
                commands: [
                    { name: '/ticket open', description: 'Create a new support ticket' },
                    { name: '/ticket close', description: 'Close a support ticket' },
                    { name: '/ticket add', description: 'Add user to ticket' },
                    { name: '/ticket remove', description: 'Remove user from ticket' }
                ]
            }
        };
    }

    /**
     * Show main help menu
     */
    async showMainHelp(interaction) {
        const config = this.client.config.getAll();
        const uptime = Date.now() - this.client.startTime;
        const uptimeString = this.formatUptime(uptime);

        const embed = new EmbedBuilder()
            .setTitle(`📚 ${config.bot.name} Help Center`)
            .setDescription(`Welcome to ${config.bot.name}! Select a category below to explore available commands.`)
            .addFields([
                {
                    name: '📊 Bot Statistics',
                    value: `**Servers:** ${this.client.guilds.cache.size}\n**Users:** ${this.client.users.cache.size}\n**Uptime:** ${uptimeString}`,
                    inline: true
                },
                {
                    name: '🚀 Quick Start',
                    value: '• Use `/dashboard` for admin settings\n• Try `/hangman start` for games\n• Use `/balance` to check coins',
                    inline: true
                },
                {
                    name: '🔗 Useful Links',
                    value: '[Support Server](https://discord.gg/example) • [Documentation](https://docs.example.com) • [Invite Bot](https://discord.com/oauth2/authorize)',
                    inline: false
                }
            ])
            .setColor(0x007BFF)
            .setThumbnail(this.client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `${config.bot.name} v${config.bot.version}` });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Choose a command category')
            .addOptions(
                Object.entries(this.categories).map(([key, category]) => ({
                    label: category.name,
                    description: category.description,
                    value: key
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Handle category selection
     */
    async handleCategorySelection(interaction) {
        const category = interaction.values[0];
        await this.showCategoryHelp(interaction, category);
    }

    /**
     * Show help for specific category
     */
    async showCategoryHelp(interaction, categoryKey) {
        const category = this.categories[categoryKey];
        if (!category) return;

        const embed = new EmbedBuilder()
            .setTitle(category.name)
            .setDescription(category.description)
            .setColor(0x28A745);

        // Add commands for this category
        const commandList = category.commands
            .map(cmd => `**${cmd.name}**\n${cmd.description}`)
            .join('\n\n');

        if (commandList) {
            embed.addFields([
                {
                    name: '📋 Available Commands',
                    value: commandList,
                    inline: false
                }
            ]);
        }

        // Add category-specific information
        if (categoryKey === 'games') {
            const gamesEnabled = this.client.config.get('games.enabled');
            const gamblingEnabled = this.client.config.get('games.gambling');
            
            embed.addFields([
                {
                    name: '⚙️ Status',
                    value: `Games: ${gamesEnabled ? '✅ Enabled' : '❌ Disabled'}\nGambling: ${gamblingEnabled ? '✅ Enabled' : '❌ Disabled'}`,
                    inline: true
                },
                {
                    name: '🔞 Age Verification',
                    value: 'Gambling features require age verification to ensure legal compliance.',
                    inline: true
                }
            ]);
        }

        if (categoryKey === 'admin') {
            embed.addFields([
                {
                    name: '🔐 Permissions Required',
                    value: 'Most admin commands require Administrator permissions or Owner status.',
                    inline: false
                }
            ]);
        }

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('🔙 Back to Main Menu')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [backButton]
        });
    }

    /**
     * Handle button interactions
     */
    async handleButtonInteraction(interaction) {
        if (interaction.customId === 'help_back') {
            await this.showMainHelp(interaction);
        }
    }

    /**
     * Format uptime duration
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

module.exports = HelpSystem;