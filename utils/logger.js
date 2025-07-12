/**
 * Logger utility for DaveBot V2
 * Provides structured logging with different levels
 */

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * Get current timestamp
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format log message
     */
    format(level, message, ...args) {
        const timestamp = this.getTimestamp();
        const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
        const extraArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] [${level.toUpperCase()}] ${formattedMessage}${extraArgs}`;
    }

    /**
     * Check if message should be logged
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    /**
     * Log error message
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.format('error', message, ...args));
        }
    }

    /**
     * Log warning message
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.format('warn', message, ...args));
        }
    }

    /**
     * Log info message
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(this.format('info', message, ...args));
        }
    }

    /**
     * Log debug message
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(this.format('debug', message, ...args));
        }
    }
}

module.exports = Logger;