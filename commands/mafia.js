const fs = require('fs');

if (!fs.existsSync('./storage')) fs.mkdirSync('./storage');
if (!fs.existsSync('./storage/mafia-games.json')) fs.writeFileSync('./storage/mafia-games.json', '{}');

let mafia_gamedata = JSON.parse(fs.readFileSync('./storage/mafia-games.json'));

bot.on('uhtml', (parts) => {
	let room = Rooms[Utils.getRoom(parts[0])];
	if (!room) {
		return;
	}
	if (room.id !== "mafia") {
		return;
	}
    if (parts[2] !== "mafia") return;

	let data = parts.slice(3).join('|');

    if (data !== `<div class="infobox">The game of Mafia has ended.</div>`) return;
    let now = new Date(Date.now());

	mafia_gamedata[Date.now()] = {
        date: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
        timestamp: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
    }

    fs.writeFileSync('./storage/mafia-games.json', JSON.stringify(mafia_gamedata));
});

// view-chatlog-mafia--2025-08-14--time-162442

let buildMafiaGamesPage = function() {
    let ret = `<div style="width:100%;height:100%;background:rgba(100, 180, 255, 0.1);overflow:auto">`;
    ret += `<center style="margin:70px">`;
    ret += `<h1>List of mafia games waiting for point awards</h1>`;
    ret += `Use this list to keep track of which games haven't had their points awarded yet. The links should all link to modlog, times are all in UTC (servertime). Deleting an entry from this list CANNOT be reverted.`;
    ret += `<table><tr><th>id</th><th>Date/Time</th><th>Delete</th></tr>`;
    for (let i in mafia_gamedata) {
        let dt = mafia_gamedata[i];
        ret += `<tr><td>${i}</td><td><a href="/view-chatlog-mafia--${dt.date}--time-${toId(dt.timestamp)}">${dt.date} ${dt.timestamp}</a></td><td><button name="send" value="/botmsg ugo, global, deletemafiagame ${i}">Delete</buton></td></tr>`;
    }
    ret += `</center></div>`
    return ret;
}

module.exports = {
    listmafiagames: function(room, user, args) {
        if (!Rooms.mafia || !user.can(Rooms.mafia, '%')) return;

        Rooms.mafia.send(`/sendhtmlpage ${user.id}, mafia-games, ${buildMafiaGamesPage()}`);
    },
    deletemafiagame: function(room, user, args) {
        if (!Rooms.mafia || !user.can(Rooms.mafia, '%')) return;

        if (!mafia_gamedata[args[0]]) user.send("Something went wrong trying to delete that mafia game from the list..");
        else {
            delete mafia_gamedata[args[0]];
            fs.writeFileSync('./storage/mafia-games.json', JSON.stringify(mafia_gamedata));
        }
        Rooms.mafia.send(`/sendhtmlpage ${user.id}, mafia-games, ${buildMafiaGamesPage()}`);
    },
    addmafiapoints: function(room, user, args) {
        if (!points.room) return user.send("Bot is not in the hub room, or none is configured.");
		if (!user.can(points.room, '%')) return;

		// Check input
		if (args.length < 6) return user.send("Usage: ``;addmafiapoints [player count], [game duration (minutes)], winners, [winner1], [winner2], ..., losers, [loser1], [loser2], ...``.");
		let players = +(args.shift());
        let duration = +(args.shift());
		if (isNaN(players)) return user.send("Player count must be a number.");
        if (players < 4) return user.send("Mafia games require at least 4 players to award points");
		if (isNaN(duration)) return user.send("Duration must be a number.");

        if (!args.includes("winners") || !args.includes("losers")) return user.send("Mafia points must include winners and losers");
        let winners = [];
        let losers = [];
        let wincount = true;
		for (let username of args) {
            if (username === "winners") continue;
            if (username === "losers") {
                wincount = false;
                continue;
            }

			if (username.trim().length > 18) return user.send(`Invalid username: \`\`${username}\`\` (usernames are less than 19 characters long, did you make a mistake?)`);
			if (toId(username).length < 1) return user.send(`Invalid username: \`\`${username}\`\` (usernames are more than 0 characters long, did you make a mistake?)`);

            if (wincount) winners.push(username);
            else losers.push(username);
		}
        if (duration < players * 2) return this.say(user, "The game's duration is too short for points.");
		let res = points.addmafiapoints(players, host, winners, losers, user.id, false);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
    },
    addmafiafishpoints: function(room, user, args) {
        if (!points.room) return user.send("Bot is not in the hub room, or none is configured.");
		if (!user.can(points.room, '%')) return;

		// Check input
		if (args.length < 7) return user.send("Usage: ``;addmafiapoints [player count], [game duration (minutes)], [host], winners, [winner1], [winner2], ..., losers, [loser1], [loser2], ...``.");
		let players = +(args.shift());
        let duration = +(args.shift());
		if (isNaN(players)) return user.send("Player count must be a number.");
		if (isNaN(duration)) return user.send("Duration must be a number.");
        let host = args.shift();

        if (!args.includes("winners") || !args.includes("losers")) return user.send("Mafia points must include winners and losers");
        let winners = [];
        let losers = [];
        let wincount = true;
		for (let username of args) {
            if (username === "winners") continue;
            if (username === "losers") {
                wincount = false;
                continue;
            }

			if (username.trim().length > 18) return user.send(`Invalid username: \`\`${username}\`\` (usernames are less than 19 characters long, did you make a mistake?)`);
			if (toId(username).length < 1) return user.send(`Invalid username: \`\`${username}\`\` (usernames are more than 0 characters long, did you make a mistake?)`);

            if (wincount) winners.push(username);
            else losers.push(username);
		}
		let res = points.addmafiapoints(players, host, winners, losers, user.id, true);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
    }
}