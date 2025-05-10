import Guild from "../models/guild.js"

export async function backupRole(guild, role) {
  try {
    const roleData = {
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
    }

    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig) return

    // Add role backup to database
    guildConfig.backups.push({
      type: "role",
      id: role.id,
      name: role.name,
      data: roleData,
    })

    await guildConfig.save()
  } catch (error) {
    console.error("Error backing up role:", error)
  }
}

export async function backupChannel(guild, channel) {
  try {
    const channelData = {
      name: channel.name,
      type: channel.type,
      parent: channel.parent ? channel.parent.id : null,
      permissionOverwrites: channel.permissionOverwrites.cache.map((overwrite) => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.bitfield.toString(),
      })),
    }

    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig) return

    // Add channel backup to database
    guildConfig.backups.push({
      type: "channel",
      id: channel.id,
      name: channel.name,
      data: channelData,
    })

    await guildConfig.save()
  } catch (error) {
    console.error("Error backing up channel:", error)
  }
}

export async function restoreRole(guild, roleId) {
  try {
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig) return null

    // Find role backup
    const backup = guildConfig.backups.find((b) => b.type === "role" && b.id === roleId)
    if (!backup) return null

    // Create new role
    const role = await guild.roles.create({
      name: backup.data.name,
      color: backup.data.color,
      hoist: backup.data.hoist,
      position: backup.data.position,
      permissions: BigInt(backup.data.permissions),
      mentionable: backup.data.mentionable,
    })

    return role
  } catch (error) {
    console.error("Error restoring role:", error)
    return null
  }
}

export async function restoreChannel(guild, channelId) {
  try {
    const guildConfig = await Guild.findOne({ guildId: guild.id })
    if (!guildConfig) return null

    // Find channel backup
    const backup = guildConfig.backups.find((b) => b.type === "channel" && b.id === channelId)
    if (!backup) return null

    // Create new channel
    const channel = await guild.channels.create({
      name: backup.data.name,
      type: backup.data.type,
      parent: backup.data.parent,
      permissionOverwrites: backup.data.permissionOverwrites.map((overwrite) => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: BigInt(overwrite.allow),
        deny: BigInt(overwrite.deny),
      })),
    })

    return channel
  } catch (error) {
    console.error("Error restoring channel:", error)
    return null
  }
}
