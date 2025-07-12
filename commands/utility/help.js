/**
 * Help Command - Interactive help system
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information and command list'),

    async execute(interaction, client) {
        const HelpSystem = require('../../systems/help');
        const helpSystem = new HelpSystem(client);
        await helpSystem.showMainHelp(interaction);
    }
};