import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"
import { backupChannel, restoreChannel } from "../utils/backup.js"

export const name = Events.ChannelDelete
export const once = false

export async function execute(channel, client) {
  try {
    // Ignore DM channels
    if (!channel.guild) return

    const guild = channel.guild

    // Backup the channel before it's fully deleted
    await backupChannel(guild, channel)

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiChannelEnabled) return

    // Get audit logs to find who deleted the channel
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "channels")

    // If not whitelisted, restore the channel
    if (!whitelisted) {
      const restoredChannel = await restoreChannel(guild, channel.id)

      if (restoredChannel) {
        // Log the action
        await logAction(
          guild,
          "Unauthorized Channel Deletion",
          `User ${executor.tag} (${executor.id}) deleted channel: ${channel.name}\nThe channel has been restored.`,
        )
      }
    }
  } catch (error) {
    console.error("Error handling channel delete event:", error)
  }
}
