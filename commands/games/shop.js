/**
 * Economy Shop Command
 * Buy items, roles, and perks with coins
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse and buy items from the server shop')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse available items')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Shop category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Roles', value: 'roles' },
                            { name: 'Perks', value: 'perks' },
                            { name: 'Items', value: 'items' },
                            { name: 'Boosts', value: 'boosts' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy an item from the shop')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to purchase')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('View your purchased items')
        ),

    async execute(interaction, client) {
        if (!client.config.isEnabled('games.economy.shop_enabled')) {
            return interaction.reply({
                content: '❌ The shop is currently disabled.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const EconomyShop = require('../../systems/economyShop');
        const shop = new EconomyShop(client);

        switch (subcommand) {
            case 'browse':
                await shop.browseShop(interaction);
                break;
            case 'buy':
                await shop.buyItem(interaction);
                break;
            case 'inventory':
                await shop.showInventory(interaction);
                break;
        }
    }
};