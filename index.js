/**
 * DaveBot V2 - Main Entry Point
 * A comprehensive Discord bot for community management and entertainment
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Database = require('./utils/database');
const ConfigManager = require('./utils/config');
const Logger = require('./utils/logger');

/**
 * Main Bot Class
 */
class DaveBot {
    constructor() {
        // Initialize Discord client with required intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        // Initialize collections for commands and events
        this.client.commands = new Collection();
        this.client.events = new Collection();
        
        // Initialize utilities
        this.database = new Database();
        this.config = new ConfigManager();
        this.logger = new Logger();
        
        // Attach utilities to client for global access
        this.client.database = this.database;
        this.client.config = this.config;
        this.client.logger = this.logger;

        this.startTime = Date.now();
        this.client.startTime = this.startTime;
    }

    /**
     * Initialize the bot
     */
    async init() {
        try {
            this.logger.info('🚀 Starting DaveBot V2...');
            
            // Initialize database
            await this.database.init();
            this.logger.info('✅ Database initialized');
            
            // Load configuration
            await this.config.load();
            this.logger.info('✅ Configuration loaded');
            
            // Load commands and events
            await this.loadCommands();
            await this.loadEvents();
            
            // Login to Discord
            await this.client.login(process.env.DISCORD_TOKEN);
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    /**
     * Load all commands from commands directory
     */
    async loadCommands() {
        const commandFolders = fs.readdirSync('./commands');
        
        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const command = require(`./commands/${folder}/${file}`);
                if (command.data && command.execute) {
                    this.client.commands.set(command.data.name, command);
                    this.logger.debug(`✅ Loaded command: ${command.data.name}`);
                }
            }
        }
        
        this.logger.info(`✅ Loaded ${this.client.commands.size} commands`);
    }

    /**
     * Load all events from events directory
     */
    async loadEvents() {
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args, this.client));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args, this.client));
            }
            this.logger.debug(`✅ Loaded event: ${event.name}`);
        }
        
        this.logger.info(`✅ Loaded ${eventFiles.length} events`);
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('🛑 Shutting down DaveBot V2...');
        
        if (this.database) {
            await this.database.close();
        }
        
        if (this.client) {
            this.client.destroy();
        }
        
        process.exit(0);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    if (global.bot) {
        await global.bot.shutdown();
    }
});

process.on('SIGTERM', async () => {
    if (global.bot) {
        await global.bot.shutdown();
    }
});

// Start the bot
const bot = new DaveBot();
global.bot = bot;
bot.init();