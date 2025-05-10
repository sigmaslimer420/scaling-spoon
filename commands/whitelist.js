import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import Guild from "../models/guild.js"
import { logModAction } from "../utils/logger.js"

export const data = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Manage the whitelist for anti-abuse features")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add a user to the whitelist")
      .addUserOption((option) => option.setName("user").setDescription("The user to whitelist").setRequired(true))
      .addStringOption((option) =>
        option
          .setName("permissions")
          .setDescription("The permissions to grant (comma-separated)")
          .setRequired(true)
          .addChoices(
            { name: "roles", value: "roles" },
            { name: "bots", value: "bots" },
            { name: "channels", value: "channels" },
            { name: "webhooks", value: "webhooks" },
            { name: "kick", value: "kick" },
            { name: "ban", value: "ban" },
            { name: "guildUpdate", value: "guildUpdate" },
            { name: "all", value: "all" },
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a user from the whitelist")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to remove from whitelist").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all whitelisted users"))

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

    if (subcommand === "add") {
      const user = interaction.options.getUser("user")
      const permissionsString = interaction.options.getString("permissions")

      // Check if user is already in whitelist
      const existingEntry = guildConfig.whitelist.find((entry) => entry.userId === user.id)

      if (existingEntry) {
        // Update existing entry
        if (permissionsString === "all") {
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
          const permissions = permissionsString.split(",")

          for (const perm of permissions) {
            if (perm in existingEntry.permissions) {
              existingEntry.permissions[perm] = true
            }
          }
        }
      } else {
        // Create new entry
        const permissions = {
          roles: false,
          bots: false,
          channels: false,
          webhooks: false,
          kick: false,
          ban: false,
          guildUpdate: false,
          all: false,
        }

        if (permissionsString === "all") {
          for (const key in permissions) {
            permissions[key] = true
          }
        } else {
          const permArray = permissionsString.split(",")

          for (const perm of permArray) {
            if (perm in permissions) {
              permissions[perm] = true
            }
          }
        }

        guildConfig.whitelist.push({
          userId: user.id,
          permissions,
        })
      }

      await guildConfig.save()

      await interaction.reply({
        content: `Added ${user.tag} to the whitelist with permissions: ${permissionsString}`,
        ephemeral: true,
      })

      await logModAction(
        interaction.guild,
        "Whitelist Add",
        interaction.user,
        user.tag,
        `Added to whitelist with permissions: ${permissionsString}`,
      )
    } else if (subcommand === "remove") {
      const user = interaction.options.getUser("user")

      // Remove user from whitelist
      const initialLength = guildConfig.whitelist.length
      guildConfig.whitelist = guildConfig.whitelist.filter((entry) => entry.userId !== user.id)

      if (guildConfig.whitelist.length < initialLength) {
        await guildConfig.save()

        await interaction.reply({ content: `Removed ${user.tag} from the whitelist`, ephemeral: true })

        await logModAction(interaction.guild, "Whitelist Remove", interaction.user, user.tag, "Removed from whitelist")
      } else {
        await interaction.reply({ content: `${user.tag} is not in the whitelist`, ephemeral: true })
      }
    } else if (subcommand === "list") {
      if (guildConfig.whitelist.length === 0) {
        await interaction.reply({ content: "No users are whitelisted", ephemeral: true })
        return
      }

      let response = "**Whitelisted Users:**\n"

      for (const entry of guildConfig.whitelist) {
        try {
          const user = await interaction.client.users.fetch(entry.userId)

          const permissions = Object.entries(entry.permissions)
            .filter(([_, value]) => value)
            .map(([key, _]) => key)
            .join(", ")

          response += `- ${user.tag} (${entry.userId}): ${permissions || "No permissions"}\n`
        } catch (error) {
          response += `- Unknown User (${entry.userId})\n`
        }
      }

      await interaction.reply({ content: response, ephemeral: true })
    }
  } catch (error) {
    console.error("Error executing whitelist command:", error)
    await interaction.reply({ content: "An error occurred while executing the command", ephemeral: true })
  }
}
