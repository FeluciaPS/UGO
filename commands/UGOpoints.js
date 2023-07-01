let cooldowns = {};
module.exports = {
	savepoints: function (room, user, args) {
		if (!user.can(Config.hubroom, '#')) return false;
		points.save();
	},
	addpoints: function (room, user, args) {
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
	eventpoints: function (room, user, args) {
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
	addtriviafish: function (room, user, args) {
		if (!user.can(points.room, '%')) return;
		if (room !== user && room.id !== 'trivia') return user.send('This command can only be used in PMs or the Trivia room');
		if (cooldowns.addtriviafish) return user.send("To avoid double-awarding points, this command is currently on cooldown because someone used it recently.");
		cooldowns.addtriviafish = true;
		setTimeout(function () {
			cooldowns.addtriviafish = false
		}, 15 * 60 * 1000);
		Rooms.trivia.send('/trivia lastofficialscore');
		Rooms.trivia.send(`/mn [${user.id}] added a trivia official`);
		return user.send('Giving out points for the last official.');
	},
	lb: 'leaderboard',
	leaderboard: function (room, user, args) {
		return points.room.send(`/sendhtmlpage ${user.id}, board, ${points.buildLeaderboard(args[0] ? toId(args[0]) : false)}`);
	},
	points: function (room, user, args) {
		let target = toId(args[0]);
		if (!target) target = user.id;
		if (!points.names[target]) return user.send(`${target} has no points.`);
		let scores = [
			["Battle Dome", points.points.battledome[target] ? points.points.battledome[target] : 0],
			["Board Games", points.points.boardgames[target] ? points.points.boardgames[target] : 0],
			["Game Corner", points.points.gamecorner[target] ? points.points.gamecorner[target] : 0],
			["Mafia", points.points.mafia[target] ? points.points.mafia[target] : 0],
			["Scavengers", points.points.scavengers[target] ? points.points.scavengers[target] : 0],
			["Survivor", points.points.survivor[target] ? points.points.survivor[target] : 0],
			["Trivia", points.points.trivia[target] ? points.points.trivia[target] : 0],
		]
		scores.sort((a, b) => b[1] - a[1]);
		let weighted = Math.floor(scores[0][1] + scores[1][1] * 1.2 + scores[2][1] * 1.4 + scores[3][1] * 1.6 + scores[4][1] * 1.8 + scores[5][1] * 2.0 + scores[6][1] * 2.2);
		let total = scores[0][1] + scores[1][1] + scores[2][1] + scores[3][1] + scores[4][1] + scores[5][1] + scores[6][1];
		
		let sobj = {}
		for (let i of scores) {
			sobj[i[0]] = i[1]
		}
		sobj.Total = total;
		sobj.Struchni = weighted;
		let ret = `<table border="1"><tr><th>Room</th><th>Points</th></tr>`
		for (let i in sobj) {
			ret += `<tr><td>${i}</td><td>${sobj[i]}</td></tr>`
		}
		ret += "</table>";
		points.room.send(`/pmuhtml ${user.id}, points-${Math.floor(Math.random() * 10000)}, ${ret}`);
	},
	authunt: 'authhunt',
	authhunt: function (room, user, args) {
		if (!points.room) return user.send("Bot is not in the hub room, or none is configured.");
		if (!user.can(points.room, '+')) return;

		// Check input
		if (args.length != 2) return user.send("Usage: ``;authhunt [username], [room]``.");
		let username = toId(args.shift());

		let gameroom = toId(args.shift());
		if (!Config.GameRooms.map(toId).includes(gameroom)) return user.send("Please input a valid room to add points for.");
		
		if (username.trim().length > 18) return user.send(`Invalid username: \`\`${username}\`\` (usernames are less than 19 characters long, did you make a mistake?)`);
		if (toId(username).length < 1) return user.send(`Invalid username: \`\`${username}\`\` (usernames are more than 0 characters long, did you make a mistake?)`);
		
		// Give points
		let amount = 10;
		let res = points.addauthhunt(amount, username, gameroom, user.id);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
	},
	help: function (room, user, args) {
		let pad = function(txt) {
			return `<div style="padding:80px">${txt}</div>`;
		}
		let ret = [
			`<b>;leaderboard</b> - displays the leaderboard for a room, or overall if no room is given - <code>;leaderboard [room]</code>`,
			`<b>;credits</b> - displays bot credits - <code>;credits</code>`,
			`<b>;git</b> - shows a link to the bot code, if one is configured - <code>;git</code>`,
			`<b>;points</b> - display points for a user, or yourself if no user is given - <code>;points [user]</code>`
		]
		if (!user.can(points.room, '%')) return points.room.send(`/sendhtmlpage ${user.id}, help, ${pad(ret.join('<br>'))}`);;
		ret = ret.concat([
			`<b>;authhunt</b> - gives auth hunt points for a certain room - <code>;authhunt [username], [room]</code>`,
			`<b>;addpoints</b> - adds points to any amount of users - <code>;addpoints [amount], [room], [user1], [user2], ...</code>`,
			`<b>;eventpoints</b> - adds points to any amount of users, ignoring spotlight multipliers - <code>;eventpoints [amount], [room], [user1], [user2], ...</code>`,
			`<b>;addhunt</b> - adds points for the last recorded scavenger hunt - <code>;addhunt</code>`,
			`<b>;addfishhunt</b>, <b>;addtwisthunt</b> and <b>;addminifishhunt</b> - same as ;addhunt, but give out points for fish, twist, and mini fish`,
			`<b>;addtriviafish</b> - Gives out trivia points according to the last official - <code>;addtriviafish</code>`
		])
		return points.room.send(`/sendhtmlpage ${user.id}, help, ${pad(ret.join('<br>'))}`);
	}
}
