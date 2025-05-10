import { ActivityType } from "discord.js"

// Default presence options
const defaultPresence = {
  status: "online", // online, idle, dnd, invisible
  activities: [
    {
      name: "Server Protection",
      type: ActivityType.Watching,
    },
  ],
}

/**
 * Updates the bot's rich presence
 * @param {Client} client - Discord.js client
 * @param {Object} options - Presence options (optional)
 */
export async function updatePresence(client, options = defaultPresence) {
  try {
    await client.user.setPresence(options)
    console.log("Rich presence updated successfully")
  } catch (error) {
    console.error("Error updating rich presence:", error)
  }
}

/**
 * Sets up a rotating presence that changes at regular intervals
 * @param {Client} client - Discord.js client
 * @param {Array} presenceOptions - Array of presence options
 * @param {number} interval - Interval in milliseconds
 */
export function setupRotatingPresence(client, presenceOptions = [], interval = 60000) {
  // If no custom options provided, use these defaults
  if (!presenceOptions || presenceOptions.length === 0) {
    presenceOptions = [
      {
        status: "online",
        activities: [{ name: "Server Protection", type: ActivityType.Watching }],
      },
      {
        status: "online",
        activities: [{ name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching }],
      },
      {
        status: "online",
        activities: [{ name: "/help for commands", type: ActivityType.Playing }],
      },
    ]
  }

  let currentIndex = 0

  // Update presence immediately
  updatePresence(client, presenceOptions[currentIndex])

  // Set up interval to rotate presence
  setInterval(() => {
    currentIndex = (currentIndex + 1) % presenceOptions.length
    updatePresence(client, presenceOptions[currentIndex])
  }, interval)
}
