/**
 * Configuration Manager for DaveBot V2
 * Handles YAML configuration loading and management
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = null;
        this.configPath = './config.yml';
    }

    /**
     * Load configuration from YAML file
     */
    async load() {
        try {
            if (!fs.existsSync(this.configPath)) {
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }

            const fileContents = fs.readFileSync(this.configPath, 'utf8');
            this.config = yaml.load(fileContents);
            
            // Validate required configuration
            this.validate();
            
            return this.config;
        } catch (error) {
            throw new Error(`Failed to load configuration: ${error.message}`);
        }
    }

    /**
     * Save configuration to YAML file
     */
    async save() {
        try {
            const yamlStr = yaml.dump(this.config, {
                indent: 2,
                lineWidth: 120,
                noRefs: true
            });
            
            fs.writeFileSync(this.configPath, yamlStr, 'utf8');
            return true;
        } catch (error) {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }

    /**
     * Get configuration value by path
     */
    get(path, defaultValue = null) {
        if (!this.config) {
            return defaultValue;
        }

        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Set configuration value by path
     */
    set(path, value) {
        if (!this.config) {
            this.config = {};
        }

        const keys = path.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * Validate required configuration options
     */
    validate() {
        const required = [
            'bot.name',
            'bot.version',
            'age_gate.enabled',
            'games.enabled',
            'leveling.enabled'
        ];

        for (const path of required) {
            if (this.get(path) === null) {
                throw new Error(`Required configuration missing: ${path}`);
            }
        }
    }

    /**
     * Get full configuration object
     */
    getAll() {
        return this.config;
    }

    /**
     * Check if feature is enabled
     */
    isEnabled(feature) {
        return this.get(`${feature}.enabled`, false);
    }
}

module.exports = ConfigManager;