import { Events, AuditLogEvent } from "discord.js"
import Guild from "../models/guild.js"
import { isWhitelisted } from "../utils/permissions.js"
import { logAction } from "../utils/logger.js"

export const name = Events.WebhooksUpdate
export const once = false

export async function execute(channel, client) {
  try {
    const guild = channel.guild

    // Get guild configuration
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.antiWebhookEnabled) return

    // Get audit logs to find webhook creation
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 })
    const log = auditLogs.entries.first()

    if (!log) return

    const { executor, target } = log

    // Check if the executor is whitelisted
    const whitelisted = await isWhitelisted(guild.id, executor.id, "webhooks")

    // If not whitelisted, delete the webhook
    if (!whitelisted) {
      // Fetch all webhooks for the channel
      const webhooks = await channel.fetchWebhooks()
      const webhook = webhooks.find((wh) => wh.id === target.id)

      if (webhook) {
        await webhook.delete("Security: Unauthorized webhook creation")

        // Log the action
        await logAction(
          guild,
          "Unauthorized Webhook Creation",
          `User ${executor.tag} (${executor.id}) created a webhook in channel: ${channel.name}\nThe webhook has been deleted.`,
        )
      }
    }
  } catch (error) {
    console.error("Error handling webhook create event:", error)
  }
}
