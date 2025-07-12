/**
 * Interaction handler for slash commands and components
 */

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                client.logger.warn(`Unknown command: ${interaction.commandName}`);
                return;
            }

            try {
                // Ensure user exists in database
                await client.database.upsertUser(interaction.user);

                // Execute command
                await command.execute(interaction, client);
                
                client.logger.debug(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
                
            } catch (error) {
                client.logger.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorMessage = 'There was an error while executing this command!';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            await handleButtonInteraction(interaction, client);
        }
        
        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction, client);
        }
        
        // Handle modal interactions
        else if (interaction.isModalSubmit()) {
            await handleModalInteraction(interaction, client);
        }
    }
};

/**
 * Handle button interactions
 */
async function handleButtonInteraction(interaction, client) {
    const customId = interaction.customId;
    
    try {
        // Age gate verification
        if (customId === 'age_verify_yes' || customId === 'age_verify_no') {
            const AgeGate = require('../systems/ageGate');
            const ageGate = new AgeGate(client);
            await ageGate.handleVerification(interaction, customId === 'age_verify_yes');
        }
        
        // Hangman game interactions
        else if (customId.startsWith('hangman_')) {
            const HangmanGame = require('../games/hangman');
            await HangmanGame.handleButtonInteraction(interaction, client);
        }
        
        // Trivia game interactions
        else if (customId.startsWith('trivia_')) {
            const TriviaGame = require('../games/trivia');
            await TriviaGame.handleButtonInteraction(interaction, client);
        }
        
        // Mini game interactions
        else if (customId.startsWith('reaction_') || customId.startsWith('memory_')) {
            const MiniGames = require('../games/miniGames');
            await MiniGames.handleButtonInteraction(interaction, client);
        }
        
        // Event interactions
        else if (customId.startsWith('event_')) {
            const EventSystem = require('../systems/eventSystem');
            const eventSystem = new EventSystem(client);
            await eventSystem.handleEventInteraction(interaction);
        }
        
        // Ticket system interactions
        else if (customId.startsWith('ticket_')) {
            const TicketSystem = require('../systems/tickets');
            const ticketSystem = new TicketSystem(client);
            await ticketSystem.handleButtonInteraction(interaction);
        }
        
        // Dashboard interactions
        else if (customId.startsWith('dashboard_')) {
            const Dashboard = require('../systems/dashboard');
            const dashboard = new Dashboard(client);
            await dashboard.handleButtonInteraction(interaction);
        }
        
        // Help system interactions
        else if (customId.startsWith('help_')) {
            const HelpSystem = require('../systems/help');
            const helpSystem = new HelpSystem(client);
            await helpSystem.handleButtonInteraction(interaction);
        }
        
        // Shop interactions
        else if (customId.startsWith('shop_')) {
            const EconomyShop = require('../systems/economyShop');
            const shop = new EconomyShop(client);
            await shop.handleShopInteraction(interaction);
        }
        
        else {
            client.logger.warn(`Unknown button interaction: ${customId}`);
        }
        
    } catch (error) {
        client.logger.error(`Error handling button interaction ${customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                ephemeral: true 
            });
        }
    }
}

/**
 * Handle select menu interactions
 */
async function handleSelectMenuInteraction(interaction, client) {
    const customId = interaction.customId;
    
    try {
        // Ticket category selection
        if (customId === 'ticket_category') {
            const TicketSystem = require('../systems/tickets');
            const ticketSystem = new TicketSystem(client);
            await ticketSystem.handleCategorySelection(interaction);
        }
        
        // Dashboard navigation
        else if (customId === 'dashboard_nav') {
            const Dashboard = require('../systems/dashboard');
            const dashboard = new Dashboard(client);
            await dashboard.handleNavigation(interaction);
        }
        
        // Help category selection
        else if (customId === 'help_category') {
            const HelpSystem = require('../systems/help');
            const helpSystem = new HelpSystem(client);
            await helpSystem.handleCategorySelection(interaction);
        }
        
        // Shop category/item selection
        else if (customId === 'shop_category' || customId === 'shop_item_select') {
            const EconomyShop = require('../systems/economyShop');
            const shop = new EconomyShop(client);
            await shop.handleShopInteraction(interaction);
        }
        
        else {
            client.logger.warn(`Unknown select menu interaction: ${customId}`);
        }
        
    } catch (error) {
        client.logger.error(`Error handling select menu interaction ${customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                ephemeral: true 
            });
        }
    }
}

/**
 * Handle modal interactions
 */
async function handleModalInteraction(interaction, client) {
    const customId = interaction.customId;
    
    try {
        // Ticket creation modal
        if (customId === 'ticket_create_modal') {
            const TicketSystem = require('../systems/tickets');
            const ticketSystem = new TicketSystem(client);
            await ticketSystem.handleTicketCreation(interaction);
        }
        
        // Dashboard configuration modals
        else if (customId.startsWith('dashboard_config_')) {
            const Dashboard = require('../systems/dashboard');
            const dashboard = new Dashboard(client);
            await dashboard.handleConfigModal(interaction);
        }
        
        else {
            client.logger.warn(`Unknown modal interaction: ${customId}`);
        }
        
    } catch (error) {
        client.logger.error(`Error handling modal interaction ${customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                ephemeral: true 
            });
        }
    }
}