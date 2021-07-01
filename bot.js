require('dotenv').config();
const Discord = require('discord.js');
const cron = require('node-cron');

const { TOKEN, GUILD_ID, ADMIN_TEXT_CHANNEL_ID, MUTE_CHAT_CHANNEL_ID, DEBUG_VC, DEBUG_TC, BOT_ID} = process.env;
const VOICE_CHANNEL_IDS = process.env.VOICE_CHANNEL_IDS.split(' ');
const prefix = "b.";

const Client = new Discord.Client();

let guild, voiceChannel, adminTextChannel, muteChat, debugVc, debugTc, gifSent;
let powerGif = "youHaveNoPower.gif";

// Searches for the voice channel with the most members and returns
// the ID of that voice channel. Returns first ID in .env file if
// all voice channels are empty
function selectVC(vcList) {

	let vcIdx = 0, max = 0;

	for (let i = 0; i < vcList.length - 1; i++) {
		voiceChannel = guild.channels.cache.get(vcList[i]);
		if (voiceChannel.members.size > max) {
			max = voiceChannel.members.size;
			vcIdx = i;
        }
	}
	return guild.channels.cache.get(vcList[vcIdx]);
}

// When bot comes online check the guild and voice channel are valid
// if they are not found the program will exit
Client.on('ready', async () => {
	try {
		guild = await Client.guilds.fetch(GUILD_ID);
		//voiceChannel = selectVC(VOICE_CHANNEL_IDS); Not necessary but not harmful?
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
	adminTextChannel = guild.channels.cache.get(ADMIN_TEXT_CHANNEL_ID);
	muteChat = guild.channels.cache.get(MUTE_CHAT_CHANNEL_ID);
	console.log('Big Ben Ready...');

	debugVc = guild.channels.cache.get(DEBUG_VC);
	debugTc = guild.channels.cache.get(DEBUG_TC);
	//const connection = await debugVc.join();
	//console.log("Joined debug vc")

	gifSent = false;

});

// Basic message detection functionality
Client.on('message', async message => {
	/*
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();
	*/

	if (!message.content.startsWith(prefix) || message.author.bot) {
		return;
	}
	else {
		if (message.content.endsWith("fun fact")) {
			message.channel.send("Did you know the American CIA would put plastic pieces at the top of people's mouth to change the way they talked as one form of disguise?");
		}
		else if (message.content.endsWith("avatar")) {
			//const avatarEmbed = new Discord.MessageEmbed()
			//	.setImage(message.author.displayAvatarURL());
			//.setDescription("test");
			message.channel.send(message.author.displayAvatarURL());
		}/*
		else if (message.content.includes("mute")) {
			let member = message.guild.member(message.mentions.users.first());
			await member.edit({ mute: true });
			console.log(`Muted ${member}`);
        }*/
    }

	
});

// Stops Big Ben from being server muted
Client.on('voiceStateUpdate', async (oldState, newState) => {

	if (newState.mute && newState.member.id == BOT_ID) {

		const logs = await oldState.guild.fetchAuditLogs({
			limit: 1,
			type: 'MEMBER_UPDATE',
		});

		const { executor, target } = logs.entries.first();

		let member = newState.member;
		await member.edit({ serverMute: false, mute: false });
		if (!gifSent) {
			
			await muteChat.send(`${executor}`, {
				files: [powerGif]
			});
			gifSent = true;
		}
    }
});


// use node-cron to create a job to run every hour
const task = cron.schedule('0 0 */1 * * *', async () => {

	gifSent = false;

	let { hour, amPm, timezoneOffsetString } = getTimeInfo();

	// if text channel was defined send message in chat
	/*
	if (adminTextChannel) {
		const messageEmbed = new Discord.MessageEmbed()
		.setColor('#FFD700')
		.setTitle(`The time is now ${hour}:00 ${amPm} GMT${timezoneOffsetString}`)
		
		adminTextChannel.send(messageEmbed);
	}
	*/

	// redetermine voice channel with most members
	voiceChannel = selectVC(VOICE_CHANNEL_IDS);

	// check if VC defined in config is empty
	if (voiceChannel.members.size >= 1) {
		try {
			// connect to voice channel
			const connection = await voiceChannel.join();
			// counter for looping
			let count = 1;
		
			// immediately invoked function that loops to play the bell sound 
			(function play() {
				connection.play('bigben.mp3')
				.on('finish', () => {
					count += 1;
					if (count <= hour) {
						play();
					} else {
						connection.disconnect();
					}
				})
			})();

		} catch(error) {
			console.log(error);
		}
	}
});

// function to get current time and return object containing
// hour and if it is am or pm
const getTimeInfo = () => {
		let time = new Date();
		let hour = time.getHours() >= 12 ? time.getHours() - 12 : time.getHours();
		hour = hour === 0 ? 12 : hour;
		let amPm = time.getHours() >= 12 ? 'PM' : 'AM';
		// get gmt offset in minutes and convert to hours
		let gmtOffset = time.getTimezoneOffset() / 60
		// turn gmt offset into a string representing the timezone in its + or - gmt offset
		let timezoneOffsetString = `${gmtOffset > 0 ? '-':'+'} ${Math.abs(gmtOffset)}`;

	return {
		hour,
		amPm,
		timezoneOffsetString
	}
}

// start the cron job
task.start();

Client.login(TOKEN);