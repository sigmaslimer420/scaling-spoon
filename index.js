import { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes } from "discord.js"
import { config } from "dotenv"
import mongoose from "mongoose"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { setupRotatingPresence } from "./utils/presence.js"

// Load environment variables
config()

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
  partials: [Partials.Channel],
})

// Collections for commands and cooldowns
client.commands = new Collection()
client.cooldowns = new Collection()

// Get the directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Load commands
const commandsPath = path.join(__dirname, "commands")
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"))

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = await import(filePath)

  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command)
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
  }
}

// Load events
const eventsPath = path.join(__dirname, "events")
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"))

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file)
  const event = await import(filePath)

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args))
  } else {
    client.on(event.name, (...args) => event.execute(...args, client))
  }
}

// Register slash commands
const commands = []
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = await import(filePath)
  commands.push(command.data.toJSON())
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN)
;(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`)

    // The put method is used to fully refresh all commands
    const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })

    console.log(`Successfully reloaded ${data.length} application (/) commands.`)
  } catch (error) {
    console.error(error)
  }
})()

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = interaction.client.commands.get(interaction.commandName)

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true })
    } else {
      await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true })
    }
  }
})

// Login to Discord
client.login(process.env.DISCORD_TOKEN).then(() => {
  // Set up rotating rich presence
  setupRotatingPresence(client)
})
