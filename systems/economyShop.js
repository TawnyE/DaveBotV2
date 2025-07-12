/**
 * Economy Shop System for DaveBot V2
 * Handles purchasing of roles, perks, and items
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class EconomyShop {
    constructor(client) {
        this.client = client;
        
        // Shop items configuration
        this.shopItems = {
            roles: [
                {
                    id: 'vip',
                    name: '⭐ VIP Role',
                    description: 'Get the VIP role and special perks',
                    price: 5000,
                    type: 'role',
                    roleId: null, // Set in guild config
                    duration: null // Permanent
                },
                {
                    id: 'supporter',
                    name: '💎 Supporter Role',
                    description: 'Show your support with this special role',
                    price: 2500,
                    type: 'role',
                    roleId: null,
                    duration: null
                }
            ],
            perks: [
                {
                    id: 'double_xp',
                    name: '⚡ Double XP Boost',
                    description: 'Double XP gain for 24 hours',
                    price: 1000,
                    type: 'boost',
                    duration: 86400000 // 24 hours in ms
                },
                {
                    id: 'daily_bonus',
                    name: '💰 Daily Bonus',
                    description: 'Increase daily coins by 50% for 7 days',
                    price: 1500,
                    type: 'boost',
                    duration: 604800000 // 7 days in ms
                }
            ],
            items: [
                {
                    id: 'lottery_ticket',
                    name: '🎫 Lottery Ticket',
                    description: 'Enter the weekly lottery draw',
                    price: 100,
                    type: 'consumable',
                    stackable: true
                },
                {
                    id: 'name_color',
                    name: '🎨 Custom Name Color',
                    description: 'Change your name color for 30 days',
                    price: 3000,
                    type: 'cosmetic',
                    duration: 2592000000 // 30 days in ms
                }
            ],
            boosts: [
                {
                    id: 'luck_boost',
                    name: '🍀 Luck Boost',
                    description: 'Increase gambling win rates for 1 hour',
                    price: 500,
                    type: 'boost',
                    duration: 3600000 // 1 hour in ms
                },
                {
                    id: 'coin_magnet',
                    name: '🧲 Coin Magnet',
                    description: 'Find extra coins in activities for 12 hours',
                    price: 800,
                    type: 'boost',
                    duration: 43200000 // 12 hours in ms
                }
            ]
        };
    }

    /**
     * Browse shop categories
     */
    async browseShop(interaction) {
        const category = interaction.options.getString('category');
        
        if (category) {
            await this.showCategory(interaction, category);
        } else {
            await this.showMainShop(interaction);
        }
    }

    /**
     * Show main shop interface
     */
    async showMainShop(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Server Shop')
            .setDescription('Welcome to the server shop! Use your coins to buy roles, perks, and special items.')
            .addFields([
                {
                    name: '⭐ Roles',
                    value: 'Special roles and permissions',
                    inline: true
                },
                {
                    name: '🚀 Perks',
                    value: 'Temporary boosts and bonuses',
                    inline: true
                },
                {
                    name: '🎁 Items',
                    value: 'Collectibles and consumables',
                    inline: true
                },
                {
                    name: '⚡ Boosts',
                    value: 'Performance enhancers',
                    inline: true
                }
            ])
            .setColor(0x00D4AA)
            .setFooter({ text: 'Select a category to browse items' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_category')
            .setPlaceholder('Choose a shop category')
            .addOptions([
                {
                    label: '⭐ Roles',
                    description: 'Special roles and permissions',
                    value: 'roles'
                },
                {
                    label: '🚀 Perks',
                    description: 'Temporary boosts and bonuses',
                    value: 'perks'
                },
                {
                    label: '🎁 Items',
                    description: 'Collectibles and consumables',
                    value: 'items'
                },
                {
                    label: '⚡ Boosts',
                    description: 'Performance enhancers',
                    value: 'boosts'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Show specific category
     */
    async showCategory(interaction, category) {
        const items = this.shopItems[category] || [];
        
        if (items.length === 0) {
            return interaction.reply({
                content: `❌ No items available in the ${category} category.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🛒 ${category.charAt(0).toUpperCase() + category.slice(1)} Shop`)
            .setDescription(`Browse ${category} available for purchase`)
            .setColor(0x00D4AA);

        const itemList = items.map(item => 
            `**${item.name}** - ${item.price.toLocaleString()} coins\n${item.description}`
        ).join('\n\n');

        embed.addFields([
            {
                name: '📦 Available Items',
                value: itemList,
                inline: false
            }
        ]);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_item_select')
            .setPlaceholder('Select an item to purchase')
            .addOptions(
                items.map(item => ({
                    label: item.name,
                    description: `${item.price.toLocaleString()} coins - ${item.description.substring(0, 50)}`,
                    value: item.id
                }))
            );

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_back')
                    .setLabel('🔙 Back to Shop')
                    .setStyle(ButtonStyle.Secondary)
            );

        const options = { embeds: [embed], components: [row1, row2] };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(options);
        } else {
            await interaction.reply(options);
        }
    }

    /**
     * Buy an item
     */
    async buyItem(interaction) {
        const itemId = interaction.options.getString('item');
        const userId = interaction.user.id;

        // Find the item
        let item = null;
        for (const category of Object.values(this.shopItems)) {
            item = category.find(i => i.id === itemId);
            if (item) break;
        }

        if (!item) {
            return interaction.reply({
                content: '❌ Item not found. Use `/shop browse` to see available items.',
                ephemeral: true
            });
        }

        // Check user's balance
        const economy = await this.client.database.get(
            'SELECT balance FROM economy WHERE user_id = ?',
            [userId]
        );

        if (!economy || economy.balance < item.price) {
            return interaction.reply({
                content: `❌ Insufficient funds! You need ${item.price.toLocaleString()} coins but only have ${economy?.balance?.toLocaleString() || 0} coins.`,
                ephemeral: true
            });
        }

        // Check if user already owns this item (for non-stackable items)
        if (!item.stackable) {
            const existing = await this.client.database.get(
                'SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
                [userId, itemId]
            );

            if (existing) {
                return interaction.reply({
                    content: '❌ You already own this item!',
                    ephemeral: true
                });
            }
        }

        // Process the purchase
        await this.processPurchase(interaction, item, userId);
    }

    /**
     * Process item purchase
     */
    async processPurchase(interaction, item, userId) {
        try {
            // Deduct coins
            await this.client.database.run(
                'UPDATE economy SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?',
                [item.price, item.price, userId]
            );

            // Add item to inventory
            const expiresAt = item.duration ? new Date(Date.now() + item.duration) : null;
            
            await this.client.database.run(
                'INSERT INTO user_inventory (user_id, item_id, item_name, item_type, purchased_at, expires_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)',
                [userId, item.id, item.name, item.type, expiresAt?.toISOString()]
            );

            // Apply item effects
            await this.applyItemEffects(interaction, item, userId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Purchase Successful!')
                .setDescription(`You have successfully purchased **${item.name}**!`)
                .addFields([
                    {
                        name: '💰 Cost',
                        value: `${item.price.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '⏰ Duration',
                        value: item.duration ? this.formatDuration(item.duration) : 'Permanent',
                        inline: true
                    }
                ])
                .setColor(0x28A745)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            this.client.logger.error('Error processing purchase:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your purchase. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Apply item effects
     */
    async applyItemEffects(interaction, item, userId) {
        switch (item.type) {
            case 'role':
                if (item.roleId && interaction.guild.roles.cache.has(item.roleId)) {
                    try {
                        const member = await interaction.guild.members.fetch(userId);
                        await member.roles.add(item.roleId);
                    } catch (error) {
                        this.client.logger.error('Error adding role:', error);
                    }
                }
                break;

            case 'boost':
                // Boosts are handled by checking the inventory when needed
                break;

            case 'consumable':
                // Consumables might have immediate effects
                if (item.id === 'lottery_ticket') {
                    // Add to lottery entries
                    await this.addLotteryEntry(userId);
                }
                break;
        }
    }

    /**
     * Show user inventory
     */
    async showInventory(interaction) {
        const userId = interaction.user.id;
        
        const items = await this.client.database.all(
            `SELECT * FROM user_inventory 
             WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
             ORDER BY purchased_at DESC`,
            [userId]
        );

        if (items.length === 0) {
            return interaction.reply({
                content: '📦 Your inventory is empty. Visit `/shop browse` to purchase items!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📦 Your Inventory')
            .setDescription('Items you own')
            .setColor(0x6F42C1);

        const itemGroups = {};
        items.forEach(item => {
            if (!itemGroups[item.item_type]) {
                itemGroups[item.item_type] = [];
            }
            itemGroups[item.item_type].push(item);
        });

        Object.entries(itemGroups).forEach(([type, typeItems]) => {
            const itemList = typeItems.map(item => {
                const expiry = item.expires_at ? 
                    `(expires <t:${Math.floor(new Date(item.expires_at).getTime() / 1000)}:R>)` : 
                    '(permanent)';
                return `• ${item.item_name} ${expiry}`;
            }).join('\n');

            embed.addFields([
                {
                    name: `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
                    value: itemList,
                    inline: false
                }
            ]);
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle shop interactions
     */
    async handleShopInteraction(interaction) {
        const customId = interaction.customId;

        if (customId === 'shop_category') {
            const category = interaction.values[0];
            await this.showCategory(interaction, category);
        } else if (customId === 'shop_item_select') {
            const itemId = interaction.values[0];
            await this.showItemDetails(interaction, itemId);
        } else if (customId === 'shop_back') {
            await this.showMainShop(interaction);
        } else if (customId.startsWith('shop_buy_')) {
            const itemId = customId.split('_')[2];
            await this.confirmPurchase(interaction, itemId);
        }
    }

    /**
     * Show item details
     */
    async showItemDetails(interaction, itemId) {
        let item = null;
        for (const category of Object.values(this.shopItems)) {
            item = category.find(i => i.id === itemId);
            if (item) break;
        }

        if (!item) return;

        const embed = new EmbedBuilder()
            .setTitle(`🛒 ${item.name}`)
            .setDescription(item.description)
            .addFields([
                {
                    name: '💰 Price',
                    value: `${item.price.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📦 Type',
                    value: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                    inline: true
                },
                {
                    name: '⏰ Duration',
                    value: item.duration ? this.formatDuration(item.duration) : 'Permanent',
                    inline: true
                }
            ])
            .setColor(0x00D4AA);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_buy_${itemId}`)
                    .setLabel('💳 Purchase')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shop_back')
                    .setLabel('🔙 Back')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Confirm purchase
     */
    async confirmPurchase(interaction, itemId) {
        // Create a pseudo-interaction for buyItem
        const pseudoInteraction = {
            ...interaction,
            options: {
                getString: (name) => name === 'item' ? itemId : null
            }
        };

        await this.buyItem(pseudoInteraction);
    }

    /**
     * Utility methods
     */
    formatDuration(ms) {
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
            return 'Less than 1 hour';
        }
    }

    async addLotteryEntry(userId) {
        // Add lottery entry logic here
        await this.client.database.run(
            'INSERT INTO lottery_entries (user_id, entry_date) VALUES (?, CURRENT_TIMESTAMP)',
            [userId]
        );
    }

    /**
     * Check if user has active boost
     */
    async hasActiveBoost(userId, boostType) {
        const boost = await this.client.database.get(
            'SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ? AND expires_at > CURRENT_TIMESTAMP',
            [userId, boostType]
        );
        return !!boost;
    }
}

module.exports = EconomyShop;