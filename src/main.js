//import functions from other files
const { timestamp } = require("./timestamp.js");
const { getRandomEmoji } = require("./random_emojis.js");


require("dotenv").config();
const fs = require("fs");
const { Client, Events, GatewayIntentBits, Partials, VoiceChannel } = require('discord.js');
const IMAGES_DIR = `./images`;
const DAILY_IMAGES_DIR = `${IMAGES_DIR}/daily`;
const kaiRESPONSE_IMAGES_DIR = `${IMAGES_DIR}/kaiResponses`;
const donRESPONSE_IMAGES_DIR = `${IMAGES_DIR}/donResponses`;


let config = require("../config.json");
fs.watchFile("../config.json", {}, () => { config = require("../config.json") });



function watchImageDir(dirname, namesArr) {
	fs.watch(dirname, {}, (event, filename) => {
		const doesExist = fs.existsSync(dirname + "/" + filename);
		const isStored = namesArr.includes(filename);

		if (doesExist && !isStored) {
			namesArr.push(filename);
		}
		if (!doesExist && isStored) {
			namesArr.filter((name) => name !== filename);
		}
	});
}

const kaiResponseImageNames = fs.readdirSync(kaiRESPONSE_IMAGES_DIR);
watchImageDir(kaiRESPONSE_IMAGES_DIR, kaiResponseImageNames);

const donResponseImageNames = fs.readdirSync(donRESPONSE_IMAGES_DIR);
watchImageDir(donRESPONSE_IMAGES_DIR, donResponseImageNames);

const dailyImageNames = fs.readdirSync(DAILY_IMAGES_DIR);
watchImageDir(DAILY_IMAGES_DIR, dailyImageNames);



function randElementOf(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomImageFilename(parentDir, imageNames) {
	let filename = "";
	let tries = 0;

	// prevents a race condition where an image has been deleted
	// but the cache of image names has not been updated yet
	while (!fs.existsSync(filename)) {
		filename = parentDir + "/" + randElementOf(imageNames);
		tries++;

		if (tries > 5) return;
	}

	return filename;
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

//Sends image and message to user who sends key words.
client.on(Events.MessageCreate, async (msg) => {
	const kaiShouldRespond = doesMessageIncludeAll(msg.content, config.kaiMessageMustInclude);
	const kaiShouldRespond2 = doesMessageIncludeAll(msg.content, config.kaiMessageMustInclude2);
	const kaiShouldRespond3 = doesMessageIncludeAll(msg.content, config.kaiMessageMustInclude3);
	if (msg.author.id === config.kaiTargetID && (kaiShouldRespond || kaiShouldRespond2 || kaiShouldRespond3)) {
		msg.channel.sendTyping();
		const image = getRandomImageFilename(kaiRESPONSE_IMAGES_DIR, kaiResponseImageNames);

		if (image === undefined) {
			timestamp("[Error] Could not find an existing response image");
			msg.channel.send({
				content: config.errorContent,
				reply: {
					messageReference: msg,
				},
			});
		} else {
			msg.channel.send({
				content: config.kaiResponseContent,
				reply: {
					messageReference: msg,
				},
				files: [
					image
				],
			});
		}
	}
	//Sends image and message to user who sends key words.
	const donShouldRespond = doesMessageIncludeAll(msg.content, config.donMessageMustInclude);
	if (msg.author.id === (config.donTargetID && (donShouldRespond) && Math.random() <= 0.1) || (msg.author.id === config.donTargetID && Math.random() <= 0.01)){
		msg.channel.sendTyping();
		const image = getRandomImageFilename(donRESPONSE_IMAGES_DIR, donResponseImageNames);

		if (image === undefined) {
			timestamp("[Error] Could not find an existing response image");
			msg.channel.send({
				content: config.errorContent,
				reply: {
					messageReference: msg,
				},
			});
		} else {
			msg.channel.send({
				content: config.donResponseContent + " " + getRandomEmoji(),
				reply: {
					messageReference: msg,
				},
				files: [
					image
				],
			});
		}
	}
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
		const image = getRandomImageFilename(DAILY_IMAGES_DIR, dailyImageNames);
		
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
const replyMessages = config.replyMessages;
function getReplyMessages() {
    return replyMessages[Math.floor(Math.random() * replyMessages.length)];
}


//Sends message to specific user ID and occurs at a set percentage
client.on(Events.MessageCreate, async (msg) => {
	if (msg.author.id === config.targetID && Math.random() <= 0.01) {
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
