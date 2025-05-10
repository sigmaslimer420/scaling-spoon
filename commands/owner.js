import { SlashCommandBuilder } from "discord.js"
import Guild from "../models/guild.js"
import { logModAction } from "../utils/logger.js"

export const data = new SlashCommandBuilder()
  .setName("owner")
  .setDescription("Owner-only commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("whitelist")
      .setDescription("Add a user to the owner whitelist")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to add to the owner whitelist").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("unwhitelist")
      .setDescription("Remove a user from the owner whitelist")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to remove from the owner whitelist").setRequired(true),
      ),
  )

export async function execute(interaction) {
  // Check if the user is the bot owner
  if (interaction.user.id !== process.env.OWNER_ID) {
    await interaction.reply({ content: "This command can only be used by the bot owner", ephemeral: true })
    return
  }

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

    if (subcommand === "whitelist") {
      const user = interaction.options.getUser("user")

      // Check if user is already in whitelist
      const existingEntry = guildConfig.whitelist.find((entry) => entry.userId === user.id)

      if (existingEntry) {
        // Update existing entry to owner
        existingEntry.isOwner = true
        existingEntry.permissions = {
          roles: true,
          bots: true,
          channels: true,
          webhooks: true,
          kick: true,
          ban: true,
          guildUpdate: true,
          all: true,
        }
      } else {
        // Create new owner entry
        guildConfig.whitelist.push({
          userId: user.id,
          isOwner: true,
          permissions: {
            roles: true,
            bots: true,
            channels: true,
            webhooks: true,
            kick: true,
            ban: true,
            guildUpdate: true,
            all: true,
          },
        })
      }

      await guildConfig.save()

      await interaction.reply({ content: `Added ${user.tag} to the owner whitelist`, ephemeral: true })

      await logModAction(
        interaction.guild,
        "Owner Whitelist Add",
        interaction.user,
        user.tag,
        "Added to owner whitelist",
      )
    } else if (subcommand === "unwhitelist") {
      const user = interaction.options.getUser("user")

      // Remove owner status from user
      const entry = guildConfig.whitelist.find((entry) => entry.userId === user.id)

      if (entry && entry.isOwner) {
        entry.isOwner = false
        await guildConfig.save()

        await interaction.reply({ content: `Removed ${user.tag} from the owner whitelist`, ephemeral: true })

        await logModAction(
          interaction.guild,
          "Owner Whitelist Remove",
          interaction.user,
          user.tag,
          "Removed from owner whitelist",
        )
      } else {
        await interaction.reply({ content: `${user.tag} is not in the owner whitelist`, ephemeral: true })
      }
    }
  } catch (error) {
    console.error("Error executing owner command:", error)
    await interaction.reply({ content: "An error occurred while executing the command", ephemeral: true })
  }
}
