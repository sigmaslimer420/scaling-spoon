import mongoose from "mongoose"

const whitelistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  roleId: { type: String },
  permissions: {
    roles: { type: Boolean, default: false },
    bots: { type: Boolean, default: false },
    channels: { type: Boolean, default: false },
    webhooks: { type: Boolean, default: false },
    kick: { type: Boolean, default: false },
    ban: { type: Boolean, default: false },
    guildUpdate: { type: Boolean, default: false },
    all: { type: Boolean, default: false },
  },
  isOwner: { type: Boolean, default: false },
})

const backupSchema = new mongoose.Schema({
  type: { type: String, enum: ["role", "channel"], required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now, expires: "30d" },
})

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String },
  antiRoleEnabled: { type: Boolean, default: true },
  antiBotEnabled: { type: Boolean, default: true },
  antiChannelEnabled: { type: Boolean, default: true },
  antiWebhookEnabled: { type: Boolean, default: true },
  antiKickEnabled: { type: Boolean, default: true },
  antiBanEnabled: { type: Boolean, default: true },
  antiGuildUpdateEnabled: { type: Boolean, default: true },
  whitelist: [whitelistSchema],
  backups: [backupSchema],
})

export default mongoose.model("Guild", guildSchema)
