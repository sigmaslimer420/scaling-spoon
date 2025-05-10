import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.ChannelCreate
export const once = false

export async function execute(channel, client) {
  try {
    // Ignore DM channels
    if (!channel.guild) return

    const guild = channel.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiChannelEnabled) return

    // Get audit logs to find who created the channel
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "channels")

    // If not whitelisted, delete the channel
    if (!whitelisted) {
      await channel.delete("Security: Unauthorized channel creation")

      // Log the action
      await logAction(
        guild,
        "Unauthorized Channel Creation",
        `User ${executor.tag} (${executor.id}) created a channel: ${channel.name}\nThe channel has been deleted.`,
      )
    }
  } catch (error) {
    console.error("Error handling channel create event:", error)
  }
}
