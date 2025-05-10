import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"
import { backupRole, restoreRole } from "../utils/backup.js"

export const name = Events.GuildRoleDelete
export const once = false

export async function execute(role, client) {
  try {
    const guild = role.guild

    // Backup the role before it's fully deleted
    await backupRole(guild, role)

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiRoleEnabled) return

    // Get audit logs to find who deleted the role
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "roles")

    // If not whitelisted, restore the role
    if (!whitelisted) {
      const restoredRole = await restoreRole(guild, role.id)

      if (restoredRole) {
        // Log the action
        await logAction(
          guild,
          "Unauthorized Role Deletion",
          `User ${executor.tag} (${executor.id}) deleted role: ${role.name}\nThe role has been restored.`,
        )
      }
    }
  } catch (error) {
    console.error("Error handling role delete event:", error)
  }
}
