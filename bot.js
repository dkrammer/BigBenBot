require('dotenv').config();
const Discord = require('discord.js');
const cron = require('node-cron');

const { TOKEN, GUILD_ID, TEXT_CHANNEL_ID } = process.env;
const VOICE_CHANNEL_IDS = process.env.VOICE_CHANNEL_IDS.split(' ');

const Client = new Discord.Client();

let guild, voiceChannel, textChannel;

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
	console.log(`VC ID is ${vcList[vcIdx]}, this is select fct msg`);
	return guild.channels.cache.get(vcList[vcIdx]);
}

function printInfoToConsole() {

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
	textChannel = guild.channels.cache.get(TEXT_CHANNEL_ID);
	console.log('Big Ben Ready...');
});

// use node-cron to create a job to run every hour
const task = cron.schedule('0 0 */1 * * *', async () => {
	let { hour, amPm, timezoneOffsetString } = getTimeInfo();

	// if text channel was defined send message in chat
	if (textChannel) {
		const messageEmbed = new Discord.MessageEmbed()
		.setColor('#FFD700')
		.setTitle(`The time is now ${hour}:00 ${amPm} GMT${timezoneOffsetString}`)
		
		textChannel.send(messageEmbed);
	}

	// redetermine voice channel with most members
	voiceChannel = selectVC(VOICE_CHANNEL_IDS);
	console.log(`The time is now ${hour}:00 ${amPm} GMT${timezoneOffsetString}`);

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