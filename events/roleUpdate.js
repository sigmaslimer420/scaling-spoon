import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted, hasDangerousPermissions } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.GuildRoleUpdate
export const once = false

export async function execute(oldRole, newRole, client) {
  try {
    const guild = newRole.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiRoleEnabled) return

    // Get audit logs to find who updated the role
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "roles")

    // If not whitelisted and dangerous permissions were added, revert the changes
    if (!whitelisted) {
      const oldDangerous = await hasDangerousPermissions(oldRole)
      const newDangerous = await hasDangerousPermissions(newRole)

      if (!oldDangerous && newDangerous) {
        await newRole.setPermissions(oldRole.permissions)

        // Log the action
        await logAction(
          guild,
          "Unauthorized Role Permission Update",
          `User ${executor.tag} (${executor.id}) added dangerous permissions to role: ${newRole.name}\nThe permissions have been reverted.`,
        )
      }
    }
  } catch (error) {
    console.error("Error handling role update event:", error)
  }
}
