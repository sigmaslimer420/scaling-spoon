import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.GuildUpdate
export const once = false

export async function execute(oldGuild, newGuild, client) {
  try {
    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: newGuild.id })
    if (!guildConfig || !guildConfig.antiGuildUpdateEnabled) return

    // Get audit logs to find who updated the guild
    const auditLogs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(newGuild.id, executor.id, "guildUpdate")

    // If not whitelisted, revert the changes if possible
    if (!whitelisted) {
      const changes = []

      // Check what was changed and revert if possible
      if (oldGuild.name !== newGuild.name) {
        await newGuild.setName(oldGuild.name).catch(() => {})
        changes.push(`Name changed from "${oldGuild.name}" to "${newGuild.name}" (reverted)`)
      }

      if (oldGuild.icon !== newGuild.icon) {
        await newGuild.setIcon(oldGuild.iconURL({ dynamic: true })).catch(() => {})
        changes.push("Guild icon was changed (reverted)")
      }

      if (oldGuild.banner !== newGuild.banner) {
        await newGuild.setBanner(oldGuild.bannerURL()).catch(() => {})
        changes.push("Guild banner was changed (reverted)")
      }

      if (changes.length > 0) {
        // Log the action
        await logAction(
          newGuild,
          "Unauthorized Guild Update",
          `User ${executor.tag} (${executor.id}) updated the guild settings:\n${changes.join("\n")}`,
        )
      }
    }
  } catch (error) {
    console.error("Error handling guild update event:", error)
  }
}
