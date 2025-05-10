import Guild from "../models/guild.js"
import { EmbedBuilder } from "discord.js"

export async function logAction(guild, action, details) {
  try {
    // Get guild configuration from database
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.logChannelId) return

    // Get log channel
    const logChannel = await guild.channels.fetch(guildConfig.logChannelId).catch(() => null)
    if (!logChannel) return

    // Create embed
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle(`Security Alert: ${action}`)
      .setDescription(details)
      .setTimestamp()
      .setFooter({ text: "Security Bot", iconURL: guild.client.user.displayAvatarURL() })

    // Send log message
    await logChannel.send({ embeds: [embed] })
  } catch (error) {
    console.error("Error logging action:", error)
  }
}

export async function logModAction(guild, action, moderator, target, reason) {
  try {
    // Get guild configuration from database
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig || !guildConfig.logChannelId) return

    // Get log channel
    const logChannel = await guild.channels.fetch(guildConfig.logChannelId).catch(() => null)
    if (!logChannel) return

    // Create embed
    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(`Moderation Action: ${action}`)
      .setDescription(
        `**Moderator:** ${moderator.tag} (${moderator.id})\n**Target:** ${target}\n**Reason:** ${reason || "No reason provided"}`,
      )
      .setTimestamp()
      .setFooter({ text: "Security Bot", iconURL: guild.client.user.displayAvatarURL() })

    // Send log message
    await logChannel.send({ embeds: [embed] })
  } catch (error) {
    console.error("Error logging moderation action:", error)
  }
}
