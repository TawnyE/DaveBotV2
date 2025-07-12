# DaveBot V2 Setup Guide 🛠️

This guide will walk you through setting up DaveBot V2 from scratch, including Discord application creation, bot configuration, and deployment.

## 📋 Prerequisites

- Node.js 16.11.0 or higher
- Discord account with server management permissions
- Basic command line knowledge

## 🔧 Step 1: Discord Application Setup

### Creating the Bot Application

1. **Visit Discord Developer Portal**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Enter "DaveBot V2" as the application name

2. **Configure Bot Settings**
   - Navigate to the "Bot" section
   - Click "Add Bot"
   - Customize the bot's username and avatar
   - Copy the bot token (keep this secure!)

3. **Set Bot Permissions**
   Required permissions for full functionality:
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
   - Manage Messages
   - Manage Roles
   - Manage Channels
   - Kick Members
   - Ban Members
   - Moderate Members

4. **Enable Privileged Intents**
   - Server Members Intent
   - Message Content Intent

### Invite Bot to Server

1. **Generate Invite URL**
   - Go to "OAuth2" → "URL Generator"
   - Select "bot" and "applications.commands" scopes
   - Select required permissions
   - Copy the generated URL

2. **Add to Server**
   - Visit the generated URL
   - Select your server
   - Authorize the bot

## 🚀 Step 2: Bot Installation

### Download and Install

```bash
# Clone the repository
git clone <repository-url>
cd davebot-v2

# Install dependencies
npm install
```

### Environment Configuration

1. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Configure .env File**
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here
   DATABASE_PATH=./data/database.sqlite
   ENVIRONMENT=production
   LOG_LEVEL=info
   ```

## ⚙️ Step 3: Configuration

### Basic Configuration

Edit `config.yml` to customize bot behavior:

```yaml
bot:
  name: "DaveBot V2"
  version: "2.0.0"
  prefix: "!"
  status: "online"
  activity: 
    type: "PLAYING"
    text: "Use /help for commands!"

# Enable/disable major features
games:
  enabled: true
  gambling: true

age_gate:
  enabled: true
  min_age: 18
  reverify_after_days: 90

leveling:
  enabled: true
  xp_per_message: 5
  xp_cooldown_seconds: 60
```

### Advanced Configuration

#### Economy Settings
```yaml
games:
  economy:
    enabled: true
    daily_amount: 100
    starting_balance: 500
    max_daily_streak: 30
```

#### Leveling System
```yaml
leveling:
  enabled: true
  xp_per_message: 5
  xp_cooldown_seconds: 60
  reward_roles:
    - level: 10
      role_id: "123456789012345678"
    - level: 25
      role_id: "987654321098765432"
```

#### Moderation Setup
```yaml
moderation:
  enabled: true
  log_channel: "123456789012345678"  # Channel ID for mod logs
  auto_timeout_duration: 300000      # 5 minutes in milliseconds
```

## 🏃‍♂️ Step 4: First Run

### Start the Bot

```bash
npm start
```

### Verify Installation

1. **Check Console Output**
   - Look for successful connection messages
   - Verify slash commands are registered
   - Confirm database initialization

2. **Test Basic Commands**
   ```
   /help          # Show help menu
   /dashboard     # Access admin panel (requires admin permissions)
   /hangman start # Test games functionality
   ```

## 🎛️ Step 5: Server-Specific Setup

### Configure Channels

Use `/dashboard` to set up channels for different features:

1. **Moderation Logging**
   - Create a staff-only channel
   - Set as moderation log channel in dashboard

2. **Level Up Notifications**
   - Create or designate a channel for level announcements
   - Configure in leveling settings

3. **Birthday Celebrations**
   - Create a general celebration channel
   - Name it with "birthday" or "celebration"

4. **Ticket System**
   - Create a category for support tickets
   - Set up support roles in dashboard

### Configure Roles

1. **Level Rewards**
   - Create roles for different level milestones
   - Add role IDs to leveling configuration

2. **Support Staff**
   - Assign appropriate roles for ticket management
   - Configure in ticket system settings

## 🔐 Step 6: Security Configuration

### Age Gate Setup

For servers using gambling features:

1. **Enable Age Verification**
   ```yaml
   age_gate:
     enabled: true
     min_age: 18
     reverify_after_days: 90
     ban_duration_days: 90
   ```

2. **Test Verification Flow**
   - Try gambling commands as a new user
   - Verify age gate prompt appears
   - Test both verification responses

### Permission Review

1. **Bot Permissions**
   - Ensure bot has necessary server permissions
   - Check role hierarchy (bot role should be high)

2. **Command Permissions**
   - Use Discord's slash command permissions
   - Restrict admin commands appropriately

## 📊 Step 7: Monitoring Setup

### Enable Logging

1. **Set Log Level**
   ```env
   LOG_LEVEL=info  # Options: debug, info, warn, error
   ```

2. **Monitor Console**
   - Watch for errors or warnings
   - Check cron job schedules
   - Verify database operations

### Database Maintenance

1. **Backup Schedule**
   - Regularly backup `./data/database.sqlite`
   - Consider automated backup solutions

2. **Cleanup Jobs**
   - Weekly cleanup is automated
   - Monitor database size growth

## 🚀 Step 8: Advanced Features

### Cron Jobs

Automated tasks run in the background:

- **Daily Economy Reset**: Resets daily claims at midnight
- **Birthday Reminders**: Checks for birthdays at 9 AM
- **Database Cleanup**: Weekly maintenance on Sundays

### Custom Commands

To add new commands:

1. Create command file in appropriate category folder
2. Follow existing command structure
3. Restart bot to load new commands

### Feature Toggles

Use the dashboard to enable/disable features:
- Games and gambling
- Leveling system
- Ticket system
- Age verification
- Utility features

## 🆘 Troubleshooting

### Common Issues

1. **Bot Not Responding**
   - Check bot is online in Discord
   - Verify token is correct
   - Ensure bot has message permissions

2. **Slash Commands Not Working**
   - Wait up to 1 hour for global command sync
   - Check bot has "Use Slash Commands" permission
   - Verify CLIENT_ID is correct

3. **Database Errors**
   - Ensure data directory exists and is writable
   - Check SQLite installation
   - Verify database path in .env

4. **Permission Errors**
   - Review bot role position in server
   - Check specific channel permissions
   - Verify intent configuration

### Getting Help

- **Console Logs**: Check for error messages
- **Discord Permissions**: Use Discord's permission calculator
- **Documentation**: Refer to Discord.js documentation
- **Support**: Join our support server for assistance

## ✅ Final Checklist

- [ ] Discord application created and configured
- [ ] Bot invited to server with correct permissions
- [ ] Environment variables set correctly
- [ ] Configuration file customized
- [ ] Bot successfully starts and connects
- [ ] Slash commands are registered
- [ ] Database initializes without errors
- [ ] Basic commands work (/help, /dashboard)
- [ ] Age gate tested (if using gambling)
- [ ] Channels and roles configured
- [ ] Logging and monitoring enabled

## 🎉 You're All Set!

DaveBot V2 is now ready to enhance your Discord community! Use `/help` to explore all available features and `/dashboard` to fine-tune settings as needed.

Remember to regularly backup your configuration and database, and keep your bot token secure.

---

**Need additional help?** Join our support Discord or check the full documentation for detailed feature guides.