import { Events } from "discord.js"
import Guild from "../models/guild.js"
import { logAction } from "../utils/logger.js"
import { isWhitelisted } from "../utils/whitelist.js" // Import isWhitelisted

export const name = Events.GuildMemberAdd
export const once = false

export async function execute(member, client) {
  try {
    // Check if the new member is a bot
    if (!member.user.bot) return

    const guild = member.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiBotEnabled) return

    // Get the user who added the bot (requires GUILD_INTEGRATIONS intent)
    const integrations = await guild.fetchIntegrations()
    const botIntegration = integrations.find((i) => i.application?.id === member.user.id)

    if (!botIntegration) {
      // If we can't determine who added the bot, kick it as a precaution
      await member.kick("Security: Unauthorized bot addition")

      await logAction(
        guild,
        "Unauthorized Bot Addition",
        `Bot ${member.user.tag} (${member.user.id}) was added to the server by an unknown user.\nThe bot has been kicked.`,
      )
      return
    }

    const addedBy = botIntegration.user

    // Check if the user who added the bot is whitelisted
    const whitelisted = await isWhitelisted(guild.id, addedBy.id, "bots")

    // If not whitelisted, kick the bot
    if (!whitelisted) {
      await member.kick("Security: Unauthorized bot addition")

      // Log the action
      await logAction(
        guild,
        "Unauthorized Bot Addition",
        `User ${addedBy.tag} (${addedBy.id}) added bot: ${member.user.tag} (${member.user.id})\nThe bot has been kicked.`,
      )
    }
  } catch (error) {
    console.error("Error handling member add event:", error)
  }
}
