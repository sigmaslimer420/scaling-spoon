import Guild from "../models/guild.js"

export async function isWhitelisted(guildId, userId, action) {
  try {
    const guildConfig = await Guild.findOne({ guildId })
    if (!guildConfig) return false

    // Check if user is in whitelist
    const user = guildConfig.whitelist.find((entry) => entry.userId === userId)
    if (!user) return false

    // Owner has all permissions
    if (user.isOwner) return true

    // Check if user has permission for specific action
    if (user.permissions.all) return true

    switch (action) {
      case "roles":
        return user.permissions.roles
      case "bots":
        return user.permissions.bots
      case "channels":
        return user.permissions.channels
      case "webhooks":
        return user.permissions.webhooks
      case "kick":
        return user.permissions.kick
      case "ban":
        return user.permissions.ban
      case "guildUpdate":
        return user.permissions.guildUpdate
      default:
        return false
    }
  } catch (error) {
    console.error("Error checking whitelist:", error)
    return false
  }
}

export async function hasDangerousPermissions(role) {
  const dangerousPermissions = [
    "Administrator",
    "BanMembers",
    "KickMembers",
    "ManageGuild",
    "ManageRoles",
    "ManageWebhooks",
    "ManageChannels",
  ]

  return dangerousPermissions.some((perm) => role.permissions.has(perm))
}
