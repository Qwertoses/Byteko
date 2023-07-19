//import functions from other files
const { timestamp } = require("./timestamp.js");
const { getRandomEmoji } = require("./random_emojis.js");
const { getRndNum } = require("./random_num.js");


require("dotenv").config();
const fs = require("fs");
const { Client, Events, GatewayIntentBits, Partials, VoiceChannel } = require('discord.js');
const IMAGES_DIR = `./images`;
const DAILY_IMAGES_DIR = `${IMAGES_DIR}/daily`;


let config = require("../config.json");
fs.watchFile("../config.json", {}, () => { global.config = require("../config.json") });



function randElementOf(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomImageFilename(parentDir) {
	if (!fs.existsSync(parentDir)) return;
	const fileNames = fs.readdirSync(parentDir);
	if (fileNames === undefined || fileNames.length === 0) return;
	return parentDir + "/" + randElementOf(fileNames);
}


const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [
		Partials.User,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Message,
	]
});



client.once(Events.ClientReady, (c) => {
	timestamp(`Ready! Logged in as ${c.user.tag}`);
});

//Method for making phrases not case sensitive
function doesMessageIncludeAll(msgContent, mustIncludeList) {
	const lowerCaseContent = msgContent.toLowerCase();
	return mustIncludeList.reduce((prev, mustInclude) => prev && lowerCaseContent.includes(mustInclude), true);
}

//Handles sending approprate messages & images to specifed users with a % chance
client.on(Events.MessageCreate, async (msg) => {
	config.modules.forEach((module) => {
		if (msg.author.id !== module.targetID) return;

		const shouldRespondToContent = module.mustIncludeOneOf.reduce((prev, mustInclude) => {
			return prev || doesMessageIncludeAll(msg.content, mustInclude);
		}, false);

		if (!shouldRespondToContent) return;

		const hasAttachments = msg.attachments !== undefined && msg.attachments.length > 0;
		const shouldRespondToAttachment = hasAttachments && msg.attachments.reduce((attachment) => {
			return module.mustIncludeOneOf.reduce((prev, mustInclude) => {
				return prev || doesMessageIncludeAll(attachment.name, mustInclude);
			}, false);
		}, false);

		if (!shouldRespondToAttachment) return;

		if (getRndNum() > module.chance * 10000) return;

		msg.channel.sendTyping();

		if (module.respondWithImage) {
			const imageFilename = getRandomImageFilename(IMAGES_DIR + "/" + module.imageDirectory);

			if (imageFilename === undefined) {
				timestamp("[Error] Could not find an existing response image");
				msg.channel.send({
					content: config.errorContent,
					reply: {
						messageReference: msg,
					},
				});
			} else {
				msg.channel.send({
					content: module.responseContent,
					reply: {
						messageReference: msg,
					},
					files: [
						imageFilename
					],
				});
			}
		} else {
			msg.channel.send({
				content: module.responseContent,
				reply: {
					messageReference: msg,
				},
			});
		}
	});
});



//Sends a daily image and message in a specific channel
const DAILY_MESSAGE_CHECK_INTERVAL = 30_000; // measured in ms
let hasSentDailyMessage = false;
setInterval(() => {
	const currentDate = new Date();
	const millisSinceMidnight = (currentDate.getHours() * 60 * 60 + currentDate.getMinutes() * 60 + currentDate.getSeconds()) * 1000;

	if (hasSentDailyMessage && millisSinceMidnight < DAILY_MESSAGE_CHECK_INTERVAL + 10_000) {
		hasSentDailyMessage = false;
	}

	const targetTime = (config.dailyMessage.hour * 60 + config.dailyMessage.minute) * 60 * 1000;
	if (!hasSentDailyMessage && millisSinceMidnight > targetTime) {
		const channel = client.channels.cache.get(config.dailyMessage.channelID);

		if (channel === undefined) {
			timestamp("[Error] Could not find daily messages channel");
			return;
		}

		channel.sendTyping();
		const image = getRandomImageFilename(DAILY_IMAGES_DIR);
		
		if (image === undefined) {
			timestamp("[Error] Could not find an existing response image");
			channel.send({
				content: config.errorContent,
			});
		} else {
			channel.send({
				content: config.dailyMessage.content,
				files: [
					image
				],
			});
		}

		hasSentDailyMessage = true;
	}
}, DAILY_MESSAGE_CHECK_INTERVAL);

//Simple method for random reply message from config file
const replyMessages = fs.readFileSync('replies.txt').toString().trim().split(/\r?\n|\r|\n/g);
function getReplyMessages() {
    return randElementOf(replyMessages).trim();
}



//Sends message to specific user ID and occurs at a set percentage
client.on(Events.MessageCreate, async (msg) => {
	if (msg.author.id === config.randomReply.targetID && getRndNum() <= config.randomReply.chance * 10000) {
		msg.channel.sendTyping();
		msg.channel.send({
			content: getReplyMessages() + " " + getRandomEmoji(),
			reply: {
				messageReference: msg,
			},
		});
	}
});


//Sends message in channel based on how many people in voice chat

client.login(process.env.DISCORD_TOKEN);
