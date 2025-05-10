import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import Guild from "../models/guild.js"
import { logModAction } from "../utils/logger.js"

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure the security bot")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("logchannel")
      .setDescription("Set the log channel for security events")
      .addChannelOption((option) =>
        option.setName("channel").setDescription("The channel to log security events to").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("toggle")
      .setDescription("Toggle security features")
      .addStringOption((option) =>
        option
          .setName("feature")
          .setDescription("The feature to toggle")
          .setRequired(true)
          .addChoices(
            { name: "Anti-Role", value: "antiRole" },
            { name: "Anti-Bot", value: "antiBot" },
            { name: "Anti-Channel", value: "antiChannel" },
            { name: "Anti-Webhook", value: "antiWebhook" },
            { name: "Anti-Kick", value: "antiKick" },
            { name: "Anti-Ban", value: "antiBan" },
            { name: "Anti-Guild Update", value: "antiGuildUpdate" },
          ),
      )
      .addBooleanOption((option) =>
        option.setName("enabled").setDescription("Whether the feature should be enabled").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Show the current configuration status"))

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    let guildConfig = await Guild.findOne({ guildId: interaction.guild.id })

    if (!guildConfig) {
      guildConfig = await Guild.create({
        guildId: interaction.guild.id,
        antiRoleEnabled: true,
        antiBotEnabled: true,
        antiChannelEnabled: true,
        antiWebhookEnabled: true,
        antiKickEnabled: true,
        antiBanEnabled: true,
        antiGuildUpdateEnabled: true,
      })
    }

    if (subcommand === "logchannel") {
      const channel = interaction.options.getChannel("channel")

      // Check if the channel is a text channel
      if (channel.type !== 0) {
        await interaction.reply({ content: "The log channel must be a text channel", ephemeral: true })
        return
      }

      guildConfig.logChannelId = channel.id
      await guildConfig.save()

      await interaction.reply({ content: `Set the log channel to ${channel}`, ephemeral: true })

      await logModAction(interaction.guild, "Config Update", interaction.user, "Log Channel", `Set to ${channel.name}`)
    } else if (subcommand === "toggle") {
      const feature = interaction.options.getString("feature")
      const enabled = interaction.options.getBoolean("enabled")

      // Update the feature
      guildConfig[`${feature}Enabled`] = enabled
      await guildConfig.save()

      await interaction.reply({
        content: `${feature} is now ${enabled ? "enabled" : "disabled"}`,
        ephemeral: true,
      })

      await logModAction(
        interaction.guild,
        "Config Update",
        interaction.user,
        feature,
        `Set to ${enabled ? "enabled" : "disabled"}`,
      )
    } else if (subcommand === "status") {
      let response = "**Current Configuration:**\n"

      response += `- Log Channel: ${guildConfig.logChannelId ? `<#${guildConfig.logChannelId}>` : "Not set"}\n`
      response += `- Anti-Role: ${guildConfig.antiRoleEnabled ? "Enabled" : "Disabled"}\n`
      response += `- Anti-Bot: ${guildConfig.antiBotEnabled ? "Enabled" : "Disabled"}\n`
      response += `- Anti-Channel: ${guildConfig.antiChannelEnabled ? "Enabled" : "Disabled"}\n`
      response += `- Anti-Webhook: ${guildConfig.antiWebhookEnabled ? "Enabled" : "Disabled"}\n`
      response += `- Anti-Kick: ${guildConfig.antiKickEnabled ? "Enabled" : "Disabled"}\n`
      response += `- Anti-Ban: ${guildConfig.antiBanEnabled ? "Enabled" : "Disabled"}\n`
      response += `- Anti-Guild Update: ${guildConfig.antiGuildUpdateEnabled ? "Enabled" : "Disabled"}\n`

      await interaction.reply({ content: response, ephemeral: true })
    }
  } catch (error) {
    console.error("Error executing config command:", error)
    await interaction.reply({ content: "An error occurred while executing the command", ephemeral: true })
  }
}
