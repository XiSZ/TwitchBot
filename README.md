# TwitchBot

A simple Twitch chatbot using Node.js and `tmi.js` that can join one or multiple channels, listen for commands, and respond.

## Features

- Multi-channel support (join several chats)
- Command prefix (default `!`)
- Built-in commands: `ping`, `help`, `join`, `leave`
- Simple cooldown to reduce spam
- Auto-reconnect

## Prerequisites

- Node.js 18+ installed
- A Twitch account for the bot (can be your own)
- OAuth token for the bot account

### Get a Twitch OAuth token

You need an OAuth token with `chat:read` and `chat:edit` scopes. Use Twitch's official OAuth flow:

#### Step 1: Register a Twitch Application

1. Go to https://dev.twitch.tv/console/apps
2. Click "Register Your Application"
3. Fill in:
   - **Name**: e.g., `MyTwitchBot`
   - **OAuth Redirect URL**: `http://localhost:5173/callback` (you can use another localhost port)
   - **Category**: Website Integration
4. Accept terms and create.
5. Copy your **Client ID** from the app details.

#### Step 2: Generate the Authorization URL

Replace `{CLIENT_ID}` with your actual Client ID:

```
https://id.twitch.tv/oauth2/authorize?response_type=token&client_id={CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&scope=chat%3Aread%20chat%3Aedit&force_verify=true
```

#### Step 3: Get Your Token

1. Open the URL in your browser.
2. Sign in with the **bot account** (the one you want to use as `TWITCH_USERNAME`).
3. Click "Authorize" to approve the app.
4. You'll be redirected to: `http://localhost:5173/callback#access_token=...&scope=...`
5. Copy everything after `access_token=` and before the next `&` (the token itself).

#### Step 4: Add to `.env`

```
TWITCH_USERNAME=your_bot_account_name
TWITCH_OAUTH_TOKEN=oauth:YOUR_TOKEN_HERE
```

**Important:**

- `TWITCH_USERNAME` must match the account you authorized.
- `TWITCH_OAUTH_TOKEN` must include the `oauth:` prefix.
- Both `chat:read` and `chat:edit` scopes are required.

**Troubleshooting tokens:**

- "Invalid OAuth token" → Check that you included the `oauth:` prefix.
- "Invalid username" → `TWITCH_USERNAME` must match the authorized account.
- "Missing scopes" → Ensure both `chat:read` and `chat:edit` are in the authorization URL.
- Token expired → Regenerate by repeating the authorization flow.
- 2FA/account issues → Ensure the bot account can sign in normally.

## Setup

1. Clone or open this folder.
2. Copy `.env.example` to `.env` and fill values:

```
TWITCH_USERNAME=your_bot_username
TWITCH_OAUTH_TOKEN=oauth:your_token
TWITCH_CHANNELS=["channel1", "channel2"]
COMMAND_PREFIX=!
BOT_OWNER=your_twitch_username
```

3. Install dependencies:

```
npm install
```

4. Start the bot using one of the methods below.

## Running the Bot

### Using NPM Scripts (Recommended)

- **`npm start`** → Simple run

  ```bash
  npm start
  ```

  Starts the bot once. Use this for regular execution.

- **`npm run dev`** → Development mode with auto-restart

  ```bash
  npm run dev
  ```

  Watches for file changes and automatically restarts the bot. Great for development.

- **`npm run prod`** → Production mode with PM2
  ```bash
  npm run prod
  ```
  Runs the bot with PM2 process manager for auto-restart on crash and persistent logging.

### Using .BAT Files (Windows)

Double-click any of these files in the project folder:

| File                 | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| **start.bat**        | Simple run - starts the bot once, pauses on exit                      |
| **dev.bat**          | Development mode - runs with nodemon for auto-restart on code changes |
| **start-simple.bat** | Quick run - starts bot without pause, window closes after             |
| **get-token.bat**    | Get Twitch OAuth token - runs token generation helper                 |

### PM2 Commands (After `npm run prod`)

```bash
pm2 status              # View all running processes
pm2 logs twitchbot      # View bot logs
pm2 stop twitchbot      # Stop the bot
pm2 restart twitchbot   # Restart the bot
pm2 delete twitchbot    # Remove from PM2
pm2 save                # Save current processes
pm2 startup             # Auto-start PM2 on system boot
```

## Usage

### General Commands

- `!ping` → replies with `Pong!`
- `!help` → lists available commands
- `!join channelname` → bot joins `#channelname` (restricted to `BOT_OWNER`)
- `!leave channelname` → bot leaves `#channelname` (restricted to `BOT_OWNER`)
- `!tokencheck` → owner-only; validates env and connection status

### League of Legends Commands

All League of Legends commands support both specifying a Riot ID or using the default from `SUMMONER_LIST` in `.env`.

- `!rank [name#tag]` → Show ranked stats (Solo/Duo queue)

  - Example: `!rank Adorbie#EUW` or just `!rank` for default
  - Output: `Adorbie#EUW | SILVER I 47LP | 62W-86L (42%)`
  - With multiple accounts: Shows all accounts from `SUMMONER_LIST`

- `!rankall [name#tag]` → Show all ranked queues with streak

  - Example: `!rankall Adorbie#EUW` or just `!rankall`
  - Output: `Adorbie#EUW: Solo/Duo: SILVER I 47LP (62W-86L 42%) | Flex 5v5: GOLD IV 15LP (28W-22L 56%) | 🔥 3-game WIN streak`
  - Shows current win/loss streak indicator with emote and clarity

- `!lp [name#tag]` → Show current LP and last change (tracks only after first use)

  - Example: `!lp Adorbie#EUW` or just `!lp`
  - Output: `Adorbie#EUW: 47 LP (+2 LP)`

- `!promo [name#tag]` → Check Solo/Duo promo progress (if any)

  - Example: `!promo Adorbie#EUW` or just `!promo`
  - Output: `Adorbie#EUW promo: WLW (2-1, need 2 wins) | SILVER I 47LP` or `Adorbie#EUW not in promos | SILVER I 47LP`

- `!tiltcheck [name#tag]` → Show current win/loss streak over recent games

  - Example: `!tiltcheck Adorbie#EUW` or just `!tiltcheck`
  - Output: `Adorbie#EUW: 🔥 3-game WIN streak`

- `!topchamps [name#tag]` → Show most played champs and winrates from recent games

  - Example: `!topchamps Adorbie#EUW` or just `!topchamps`
  - Output: `Adorbie#EUW top champs (last 20 games): Janna 10G 60% | Lux 8G 50% | Ahri 6G 67%`

- `!mastery [name#tag]` → Show top 3 champion masteries

  - Example: `!mastery Adorbie#EUW` or just `!mastery`
  - Output: `Adorbie#EUW [Score: 234] | Janna (7) 450k | Lux (6) 320k | Ahri (5) 180k`

- `!champstats [name#tag]` → Show champion winrates (last 20 games)

  - Example: `!champstats Adorbie#EUW` or just `!champstats`
  - Output: `Adorbie#EUW: Janna 12W-8L (60%) | Lux 8W-12L (40%) | Ahri 6W-8L (43%)`
  - Sorted by most played champions

- `!profile [name#tag]` → Show summoner profile info (level, mastery score, honor, icon, last played champ/time)

  - Example: `!profile Adorbie#EUW` or just `!profile`
  - Output: `Adorbie#EUW | Level 598 | Mastery Score: 234 | Honor: 5 Icon: 1234 | Last: Janna (12m ago)`

- `!livegame [name#tag]` → Show current live game info with team composition

  - Example: `!livegame Adorbie#EUW` or just `!livegame`
  - Output: `Adorbie#EUW is in game | Janna | CLASSIC | 15min | Ally: [Janna, Zyra, Ahri, Yasuo, Leona] 12K | Enemy: [Thresh, Brand, Lux, Syndra, Jinx] 8K`
  - Shows both teams' champions and kill counts

- `!pastgame [name#tag]` → Show last game details with full stats

  - Example: `!pastgame Adorbie#EUW` or just `!pastgame`
  - Output: `Adorbie#EUW [W] Janna 2/3/15 (5.67 KDA) | 45CS (1.6/min) | 12kDMG | 28min`
  - Includes CS per minute and damage dealt

- `!matchhistory [name#tag]` → Show last 3 games summary

  - Example: `!matchhistory Adorbie#EUW` or just `!matchhistory`
  - Output: `Adorbie#EUW: ✅ W Janna 2/3/15  |  ❌ L Lux 5/8/10  |  ✅ W Ahri 12/2/8`

- `!winrate [name#tag] [count]` → Show recent winrate (default 10, max 25)

  - Example: `!winrate Adorbie#EUW 15` or just `!winrate`
  - If no name is provided, it will show winrate for all summoners in `SUMMONER_LIST`
  - Output: `Adorbie#EUW: 9W-6L (60%) over last 15 games`

- `!rotation` → Show free-to-play champion rotation

  - Output: `Free to play: Janna | Lux | Ahri | Zyra | Thresh`

- `!status [region]` → Show LoL server status (defaults to EUW1 if omitted)

  - Region inputs accepted (aliases): NA/NA1, EUW/EUW1, EUNE/EUN1, KR, BR/BR1, LA/LAN/LA1, LAS/LA2, OC/OCE/OC1, RU, TR/TR1, JP/JP1, SG/SG2/SEA
  - Output: `[EUW1] ✅ All servers operational` or `[NA1] ⚠ INCIDENT: Server issue`

- `!draft [role]` → Suggest bans for a given role (and optionally elo)
  - Example: `!draft top`
  - Output: `Suggested bans for top: Darius, Fiora, Jax`

**Setting up League of Legends features:**

Add these to your `.env` file:

```env
# Riot Games API
RIOT_API_KEY=RGAPI-your-api-key-here
RIOT_API_REGION=euw1
RIOT_API_REGIONAL=europe
SUMMONER_LIST="Adorbie#EUW,IXiSZI#EUW"
```

- Get your API key from: https://developer.riotgames.com/
- Region examples: `na1`, `euw1`, `kr`, `br1`, etc.
- Regional examples: `americas`, `europe`, `asia`, `sea`
- Multiple summoners in `SUMMONER_LIST` are comma-separated

Notes:

- Channels in `.env` are provided as a JSON array without `#`. The bot will join `#channel` automatically.
- Example: `TWITCH_CHANNELS=["channel1", "channel2"]`
- You can also dynamically join/leave via commands.

## Development

- Edit commands in `src/commands/`
- Add new commands by creating files that export `{ name, description, usage, cooldown, execute }`.

## Troubleshooting

- If you see auth errors, verify `TWITCH_USERNAME` matches the account that generated the `TWITCH_OAUTH_TOKEN`.
- Ensure the token includes the `oauth:` prefix.
- Firewalls/VPNs can sometimes block connection; try without VPN.
