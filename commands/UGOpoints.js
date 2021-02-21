const { rooms } = require("../config");
const points = require("../points");

let cooldowns = {};
module.exports = {
	savepoints: function(room, user, args) {
        if (!user.can(Config.hubroom, '#')) return false;
		points.save();
	},
	addpoints: function(room, user, args) {
		if (!points.room) return user.send("Bot is not in the hub room, or none is configured.");
		if (!user.can(points.room, '%')) return;
		
		// Check input
		if (args.length < 3) return user.send("Usage: ``;addpoints [amount], [room], [user1], [user2], ...``.");
		let amount = parseInt(args.shift());
		if (isNaN(amount)) return user.send("Amount must be a number.");
		let gameroom = toId(args.shift());
		if (!Config.GameRooms.map(toId).includes(gameroom)) return user.send("Please input a valid room to add points for.");
		for (let username of args) {
			if (username.trim().length > 18) return user.send(`Invalid username: \`\`${username}\`\` (usernames are less than 19 characters long, did you make a mistake?)`);
			if (toId(username).length < 1) return user.send(`Invalid username: \`\`${username}\`\` (usernames are more than 0 characters long, did you make a mistake?)`);
		}
		let res = points.addpoints(amount, args, gameroom, user.id);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
	},
	eventpoints: function(room, user, args) {
		if (!points.room) return user.send("Bot is not in the hub room, or none is configured.");
		if (!user.can(points.room, '%')) return;
		
		// Check input
		if (args.length < 3) return user.send("Usage: ``;eventpoints [amount], [room], [user1], [user2], ...``.");
		let amount = parseInt(args.shift());
		if (isNaN(amount)) return user.send("Amount must be a number.");
		let gameroom = toId(args.shift());
		if (!Config.GameRooms.map(toId).includes(gameroom)) return user.send("Please input a valid room to add points for.");
		for (let username of args) {
			if (username.trim().length > 18) return user.send(`Invalid username: \`\`${username}\`\` (usernames are less than 19 characters long, did you make a mistake?)`);
			if (toId(username).length < 1) return user.send(`Invalid username: \`\`${username}\`\` (usernames are more than 0 characters long, did you make a mistake?)`);
		}
		let res = points.addeventpoints(amount, args, gameroom, user.id);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
	},
	addminifishhunt: 'addhunt',
	addfishhunt: 'addhunt',
	addhunt: function(room, user, args, val, time, cmd) {
		if (!user.can(points.room, '%')) return;
		if (args.length < 2) return user.send('Scavenger hunts need at the very least one winner and a host');
		let res = points.addhunt(args, cmd === 'addfishhunt' ? 2 : (cmd === 'addhunt' ? 1 : 1.5), user.id);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
	},
	addtriviafish: function(room, user, args) {
		if (!user.can(points.room, '%')) return;
		if (room !== user && room.id !== 'trivia') return user.send('This command can only be used in PMs or the Trivia room');
		if (cooldowns.addtriviafish) return user.send("To avoid double-awarding points, this command is currently on cooldown because someone used it recently.");
		cooldowns.addtriviafish = true;
		setTimeout(function() {cooldowns.addtriviafish = false}, 15 * 60 * 1000);
		rooms.trivia.send('/trivia lastofficialscore');
		return user.send('Giving out points for the last official.');
 	},
	leaderboard: function(room, user, args) {
		return points.room.send(`/sendhtmlpage ${user.id}, board, ${points.buildLeaderboard(args[0] ? toId(args[0]) : false)}`);
	},
	help: function(room, user, args) {
		let ret = [
			`<b>;leaderboard</b> - displays the leaderboard for a room, or overall if no room is given - <code>;leaderboard [room]</code>`,
		]
		if (!user.can(points.room, '%')) return points.room.send(`/pmuhtml ${user.id}, help, ${ret.join('<br>')}`);;
		ret = ret.concat([
			`<b>;addpoints</b> - adds points to any amount of users - <code>;addpoints [amount], [room], [user1], [user2], ...</code>`,
			`<b>;eventpoints</b> - adds points to any amount of users, ignoring spotlight multipliers - <code>;eventpoints [amount], [room], [user1], [user2], ...</code>`,
			`<b>;addhunt</b> - adds points for a scavenger hunt - <code>;addhunt [host], [user1], [user2], ...</code>`,
			`<b>;addfishhunt</b> and <b>;addminifishhunt</b> - same as ;addhunt, but give out more points for fish and mini fish`,
			`<b>;addtriviafish</b> - Gives out trivia points according to the last official - <code>;addtriviafish</code>`
		])
		return points.room.send(`/pmuhtml ${user.id}, help, ${ret.join('<br>')}`);
	}
}
