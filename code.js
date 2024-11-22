const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// Account credentials
const accounts = [
    { apiId: 22799730, apiHash: "269dfab74416274c5673514e2c792c0b", phoneNumber: "+6283139305625" },
    // Add more accounts
];

// Global variables
let isActive = false;
let currentTask = null;

// Wait time between messages
const WAIT_TIME = 5; // Millisecondsnpm

// Read messages from a file
function readMessagesFromFile(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8").split("\n").filter((line) => line.trim());
    } catch (err) {
        console.error("Error reading messages file:", err);
        return [];
    }
}

// Send messages to a group
async function sendMessages(client, groupLink, messages) {
    try {
        let replyTo = null;

        for (const message of messages) {
            if (!isActive) {
                console.log("Bot stopped. Halting message sending.");
                break;
            }

            try {
                const response = await client.sendMessage(groupLink, { message, replyToMsgId: replyTo });
                console.log(`Message sent: ${message}`);

                replyTo = response.id; // Update reply ID for threading
            } catch (error) {
                console.error("Error sending message:", error);
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
        }
    } catch (error) {
        console.error("Error during message sending:", error);
    }
}

// Main logic
async function startMessaging(groupLink) {
    isActive = true;
    const messages = readMessagesFromFile(path.join(__dirname, "messages_account_1.txt"));

    for (const account of accounts) {
        if (!isActive) break;

        const session = new StringSession(""); // Empty session string
        const client = new TelegramClient(session, account.apiId, account.apiHash, {
            connectionRetries: 5,
        });

        try {
            await client.start({ phoneNumber: account.phoneNumber });
            console.log(`Client ${account.phoneNumber} connected.`);
            await client.joinChannel(groupLink);

            await sendMessages(client, groupLink, messages);
        } catch (error) {
            console.error(`Error with client ${account.phoneNumber}:`, error);
        } finally {
            await client.disconnect();
        }
    }

    isActive = false;
}

// Telegram bot handling
const botToken = "7811375839:AAF6RUqdij40WsN_aiOuNNOMny337u5v6TI"; // Replace with your bot token
const bot = new TelegramBot(botToken, { polling: true });

bot.onText(/\/start (.+)/, (msg, match) => {
    const groupLink = match[1];
    if (!groupLink.startsWith("https://t.me/") && !groupLink.startsWith("@")) {
        bot.sendMessage(msg.chat.id, "Invalid group link. Please provide a valid link.");
        return;
    }

    bot.sendMessage(msg.chat.id, "Starting message sending...");
    if (currentTask) clearTimeout(currentTask);

    currentTask = setTimeout(() => startMessaging(groupLink), 0);
});

bot.onText(/\/stop/, (msg) => {
    isActive = false;
    bot.sendMessage(msg.chat.id, "Stopping the bot...");
    if (currentTask) clearTimeout(currentTask);
});
