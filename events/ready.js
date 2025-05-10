import { Events } from "discord.js"
import Guild from "../models/guild.js"
import { setupRotatingPresence } from "../utils/presence.js"

export const name = Events.ClientReady
export const once = true

export async function execute(client) {
  console.log(`Ready! Logged in as ${client.user.tag}`)

  // Initialize guild configurations for all guilds the bot is in
  for (const guild of client.guilds.cache.values()) {
    const guildConfig = await Guild.findOne({ guildId: guild.id })

    if (!guildConfig) {
      // Create new guild configuration if it doesn't exist
      await Guild.create({
        guildId: guild.id,
        antiRoleEnabled: true,
        antiBotEnabled: true,
        antiChannelEnabled: true,
        antiWebhookEnabled: true,
        antiKickEnabled: true,
        antiBanEnabled: true,
        antiGuildUpdateEnabled: true,
      })
      console.log(`Initialized configuration for guild: ${guild.name}`)
    }
  }

  // Set up rotating rich presence
  setupRotatingPresence(client)
}
