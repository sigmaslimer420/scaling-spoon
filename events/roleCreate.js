import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted, hasDangerousPermissions } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.GuildRoleCreate
export const once = false

export async function execute(role, client) {
  try {
    const guild = role.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiRoleEnabled) return

    // Get audit logs to find who created the role
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "roles")

    // If not whitelisted and the role has dangerous permissions, delete it
    if (!whitelisted && (await hasDangerousPermissions(role))) {
      await role.delete("Security: Unauthorized role creation with dangerous permissions")

      // Log the action
      await logAction(
        guild,
        "Unauthorized Role Creation",
        `User ${executor.tag} (${executor.id}) created a role with dangerous permissions: ${role.name}\nThe role has been deleted.`,
      )
    }
  } catch (error) {
    console.error("Error handling role create event:", error)
  }
}
