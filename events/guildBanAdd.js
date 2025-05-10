import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.GuildBanAdd
export const once = false

export async function execute(ban, client) {
  try {
    const guild = ban.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiBanEnabled) return

    // Get audit logs to find who banned the user
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor, target } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "ban")

    // If not whitelisted, unban the user
    if (!whitelisted) {
      await guild.members.unban(target.id, "Security: Unauthorized ban")

      // Log the action
      await logAction(
        guild,
        "Unauthorized Member Ban",
        `User ${executor.tag} (${executor.id}) banned user: ${target.tag} (${target.id})\nThe user has been unbanned.`,
      )

      // Remove dangerous permissions from the executor if they have a role
      const executorMember = await guild.members.fetch(executor.id).catch(() => null)
      if (executorMember) {
        for (const [_, role] of executorMember.roles.cache) {
          if (role.permissions.has("BanMembers")) {
            await role
              .setPermissions(role.permissions.remove("BanMembers"))
              .catch((err) => console.error("Error removing permissions:", err))
          }
        }
      }
    }
  } catch (error) {
    console.error("Error handling ban add event:", error)
  }
}
