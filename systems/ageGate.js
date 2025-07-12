/**
 * Age Gate System for DaveBot V2
 * Handles age verification for gambling features
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class AgeGate {
    constructor(client) {
        this.client = client;
        this.config = client.config.get('age_gate');
    }

    /**
     * Check if user needs age verification
     */
    async needsVerification(userId) {
        if (!this.config.enabled) return false;

        const verification = await this.client.database.get(
            'SELECT * FROM age_verification WHERE user_id = ?',
            [userId]
        );

        if (!verification) return true;

        // Check if user is banned and ban expired
        if (verification.ban_expires) {
            const banExpires = new Date(verification.ban_expires);
            if (banExpires > new Date()) {
                return 'banned';
            } else if (!verification.verified) {
                // Ban expired, allow re-verification
                await this.client.database.run(
                    'UPDATE age_verification SET ban_expires = NULL WHERE user_id = ?',
                    [userId]
                );
                return true;
            }
        }

        // Check if reverification is needed
        if (verification.verified && this.config.reverify_after_days > 0) {
            const verificationDate = new Date(verification.verification_date);
            const daysSinceVerification = (Date.now() - verificationDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceVerification > this.config.reverify_after_days) {
                return true;
            }
        }

        return !verification.verified;
    }

    /**
     * Show age verification prompt
     */
    async showVerificationPrompt(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔞 Age Verification Required')
            .setDescription(`To access gambling features, you must verify that you are at least ${this.config.min_age} years old.\n\n**This verification is legally required and helps us maintain a safe environment.**`)
            .addFields([
                {
                    name: '❓ Are you 18 or older?',
                    value: 'Please select one of the options below:',
                    inline: false
                },
                {
                    name: '⚠️ Important Notice',
                    value: 'If you select "No", you will be restricted from gambling features for 90 days.',
                    inline: false
                }
            ])
            .setColor(0xFF6B35)
            .setFooter({ text: 'DaveBot V2 Age Verification System' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('age_verify_yes')
                    .setLabel('✅ Yes, I am 18 or older')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('age_verify_no')
                    .setLabel('❌ No, I am under 18')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }

    /**
     * Handle age verification response
     */
    async handleVerification(interaction, isVerified) {
        const userId = interaction.user.id;
        const now = new Date();

        try {
            if (isVerified) {
                // User verified as 18+
                await this.client.database.run(
                    `INSERT OR REPLACE INTO age_verification 
                     (user_id, verified, verification_date, ban_expires, attempts, last_attempt) 
                     VALUES (?, ?, ?, NULL, 0, ?)`,
                    [userId, true, now.toISOString(), now.toISOString()]
                );

                const embed = new EmbedBuilder()
                    .setTitle('✅ Age Verification Successful')
                    .setDescription('Thank you for verifying your age. You now have access to all gambling features.')
                    .setColor(0x28A745)
                    .setFooter({ text: 'Remember to gamble responsibly!' });

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

            } else {
                // User is under 18
                const banExpires = new Date(now.getTime() + (this.config.ban_duration_days * 24 * 60 * 60 * 1000));
                
                await this.client.database.run(
                    `INSERT OR REPLACE INTO age_verification 
                     (user_id, verified, verification_date, ban_expires, attempts, last_attempt) 
                     VALUES (?, ?, NULL, ?, 1, ?)`,
                    [userId, false, banExpires.toISOString(), now.toISOString()]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🚫 Access Restricted')
                    .setDescription(`Thank you for your honesty. Gambling features are restricted for users under ${this.config.min_age}.`)
                    .addFields([
                        {
                            name: '⏰ Restriction Duration',
                            value: `You will be able to re-verify your age after **${this.config.ban_duration_days} days**.`,
                            inline: false
                        },
                        {
                            name: '📅 Restriction Expires',
                            value: `<t:${Math.floor(banExpires.getTime() / 1000)}:F>`,
                            inline: false
                        }
                    ])
                    .setColor(0xDC3545)
                    .setFooter({ text: 'This helps us maintain a safe and legal environment.' });

                await interaction.update({
                    embeds: [embed],
                    components: []
                });
            }

        } catch (error) {
            this.client.logger.error('Error handling age verification:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Verification Error')
                .setDescription('An error occurred during verification. Please try again later.')
                .setColor(0xDC3545);

            await interaction.update({
                embeds: [errorEmbed],
                components: []
            });
        }
    }

    /**
     * Check if user can access gambling features
     */
    async canAccessGambling(userId) {
        const verificationStatus = await this.needsVerification(userId);
        
        if (verificationStatus === false) {
            return { allowed: true };
        } else if (verificationStatus === 'banned') {
            const verification = await this.client.database.get(
                'SELECT ban_expires FROM age_verification WHERE user_id = ?',
                [userId]
            );
            
            return { 
                allowed: false, 
                reason: 'age_restricted',
                banExpires: verification.ban_expires
            };
        } else {
            return { 
                allowed: false, 
                reason: 'needs_verification'
            };
        }
    }
}

module.exports = AgeGate;