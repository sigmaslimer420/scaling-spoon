import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import Guild from "../models/guild.js"
import { restoreRole, restoreChannel } from "../utils/backup.js"
import { logModAction } from "../utils/logger.js"

export const data = new SlashCommandBuilder()
  .setName("restore")
  .setDescription("Restore deleted roles or channels")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List available backups"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("role")
      .setDescription("Restore a deleted role")
      .addStringOption((option) =>
        option.setName("id").setDescription("The ID of the role to restore").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("channel")
      .setDescription("Restore a deleted channel")
      .addStringOption((option) =>
        option.setName("id").setDescription("The ID of the channel to restore").setRequired(true),
      ),
  )

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id })

    if (!guildConfig) {
      await interaction.reply({ content: "No configuration found for this guild", ephemeral: true })
      return
    }

    if (subcommand === "list") {
      if (guildConfig.backups.length === 0) {
        await interaction.reply({ content: "No backups available", ephemeral: true })
        return
      }

      // Sort backups by creation date (newest first)
      const sortedBackups = [...guildConfig.backups].sort((a, b) => b.createdAt - a.createdAt)

      let response = "**Available Backups:**\n"

      // Group backups by type
      const roleBackups = sortedBackups.filter((backup) => backup.type === "role")
      const channelBackups = sortedBackups.filter((backup) => backup.type === "channel")

      if (roleBackups.length > 0) {
        response += "\n**Roles:**\n"
        for (const backup of roleBackups.slice(0, 10)) {
          const date = new Date(backup.createdAt).toLocaleString()
          response += `- ${backup.name} (ID: ${backup.id}) - ${date}\n`
        }

        if (roleBackups.length > 10) {
          response += `...and ${roleBackups.length - 10} more roles\n`
        }
      }

      if (channelBackups.length > 0) {
        response += "\n**Channels:**\n"
        for (const backup of channelBackups.slice(0, 10)) {
          const date = new Date(backup.createdAt).toLocaleString()
          response += `- ${backup.name} (ID: ${backup.id}) - ${date}\n`
        }

        if (channelBackups.length > 10) {
          response += `...and ${channelBackups.length - 10} more channels\n`
        }
      }

      response += "\nUse `/restore role` or `/restore channel` with the ID to restore a backup."

      await interaction.reply({ content: response, ephemeral: true })
    } else if (subcommand === "role") {
      const roleId = interaction.options.getString("id")

      // Check if backup exists
      const backup = guildConfig.backups.find((b) => b.type === "role" && b.id === roleId)

      if (!backup) {
        await interaction.reply({ content: "No backup found for this role ID", ephemeral: true })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      // Restore the role
      const role = await restoreRole(interaction.guild, roleId)

      if (role) {
        await interaction.editReply({ content: `Successfully restored role: ${role.name}` })

        await logModAction(
          interaction.guild,
          "Role Restore",
          interaction.user,
          role.name,
          `Restored role with ID ${roleId}`,
        )
      } else {
        await interaction.editReply({ content: "Failed to restore role" })
      }
    } else if (subcommand === "channel") {
      const channelId = interaction.options.getString("id")

      // Check if backup exists
      const backup = guildConfig.backups.find((b) => b.type === "channel" && b.id === channelId)

      if (!backup) {
        await interaction.reply({ content: "No backup found for this channel ID", ephemeral: true })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      // Restore the channel
      const channel = await restoreChannel(interaction.guild, channelId)

      if (channel) {
        await interaction.editReply({ content: `Successfully restored channel: ${channel.name}` })

        await logModAction(
          interaction.guild,
          "Channel Restore",
          interaction.user,
          channel.name,
          `Restored channel with ID ${channelId}`,
        )
      } else {
        await interaction.editReply({ content: "Failed to restore channel" })
      }
    }
  } catch (error) {
    console.error("Error executing restore command:", error)

    if (interaction.deferred) {
      await interaction.editReply({ content: "An error occurred while executing the command" })
    } else {
      await interaction.reply({ content: "An error occurred while executing the command", ephemeral: true })
    }
  }
}
