import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.GuildMemberRemove
export const once = false

export async function execute(member, client) {
  try {
    const guild = member.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig) return

    // Get audit logs to determine if this was a kick
    const kickLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 })
    const kickLog = kickLogs.entries.first()

    // Check if this was a kick and it was recent (within the last 5 seconds)
    if (
      kickLog &&
      kickLog.target.id === member.id &&
      Date.now() - kickLog.createdTimestamp < 5000 &&
      guildConfig.antiKickEnabled
    ) {
      const { executor } = kickLog

      // Check if the executor is whitelisted
      const whitelisted = await isWhitelisted(guild.id, executor.id, "kick")

      // If not whitelisted, log the unauthorized kick
      if (!whitelisted) {
        // Log the action
        await logAction(
          guild,
          "Unauthorized Member Kick",
          `User ${executor.tag} (${executor.id}) kicked member: ${member.user.tag} (${member.id})`,
        )

        // Remove dangerous permissions from the executor if they have a role
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (executorMember) {
          for (const [_, role] of executorMember.roles.cache) {
            if (role.permissions.has("KickMembers")) {
              await role
                .setPermissions(role.permissions.remove("KickMembers"))
                .catch((err) => console.error("Error removing permissions:", err))
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error handling member remove event:", error)
  }
}
