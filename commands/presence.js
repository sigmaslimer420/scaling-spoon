import { SlashCommandBuilder, PermissionFlagsBits, ActivityType } from "discord.js"
import { updatePresence } from "../utils/presence.js"
import { logModAction } from "../utils/logger.js"

export const data = new SlashCommandBuilder()
  .setName("presence")
  .setDescription("Change the bot's rich presence")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set")
      .setDescription("Set the bot's status and activity")
      .addStringOption((option) =>
        option
          .setName("status")
          .setDescription("The bot's status")
          .setRequired(true)
          .addChoices(
            { name: "Online", value: "online" },
            { name: "Idle", value: "idle" },
            { name: "Do Not Disturb", value: "dnd" },
            { name: "Invisible", value: "invisible" },
          ),
      )
      .addStringOption((option) =>
        option
          .setName("activity_type")
          .setDescription("The type of activity")
          .setRequired(true)
          .addChoices(
            { name: "Playing", value: "Playing" },
            { name: "Streaming", value: "Streaming" },
            { name: "Listening", value: "Listening" },
            { name: "Watching", value: "Watching" },
            { name: "Competing", value: "Competing" },
          ),
      )
      .addStringOption((option) =>
        option.setName("activity_name").setDescription("The name of the activity").setRequired(true),
      )
      .addStringOption((option) =>
        option.setName("url").setDescription("The URL for streaming status (only for Streaming type)"),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("reset").setDescription("Reset the bot's presence to default"))

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand()

  try {
    if (subcommand === "set") {
      const status = interaction.options.getString("status")
      const activityType = interaction.options.getString("activity_type")
      const activityName = interaction.options.getString("activity_name")
      const url = interaction.options.getString("url")

      // Map activity type string to ActivityType enum
      const activityTypeMap = {
        Playing: ActivityType.Playing,
        Streaming: ActivityType.Streaming,
        Listening: ActivityType.Listening,
        Watching: ActivityType.Watching,
        Competing: ActivityType.Competing,
      }

      const presenceOptions = {
        status,
        activities: [
          {
            name: activityName,
            type: activityTypeMap[activityType],
            url: activityType === "Streaming" ? url : undefined,
          },
        ],
      }

      await updatePresence(interaction.client, presenceOptions)

      await interaction.reply({
        content: `Rich presence updated to: ${status} ${activityType} ${activityName}`,
        ephemeral: true,
      })

      await logModAction(
        interaction.guild,
        "Presence Update",
        interaction.user,
        "Bot Presence",
        `Set to ${status} ${activityType} ${activityName}`,
      )
    } else if (subcommand === "reset") {
      await updatePresence(interaction.client) // Use default options

      await interaction.reply({
        content: "Rich presence reset to default",
        ephemeral: true,
      })

      await logModAction(interaction.guild, "Presence Update", interaction.user, "Bot Presence", "Reset to default")
    }
  } catch (error) {
    console.error("Error executing presence command:", error)
    await interaction.reply({ content: "An error occurred while executing the command", ephemeral: true })
  }
}
