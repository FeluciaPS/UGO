/**
 * Returns a Date object converted to Eastern Time
 */
let getESTDate = function () {
	let now = Date.now();

	// Subtract 5 hours to convert from UTC to EST
	let est = now - 5 * 60 * 60 * 1000

	return new Date(est);
}

let getRoomName = function (roomid) {
	for (let i of Config.GameRooms) {
		if (toId(i) === roomid) return i;
	}
	return roomid;
}

let roundPoints = function(points) {
	if (points < 0) return Math.ceil(points);
	return Math.floor(points);
}
let {escape, unescape} = require('html-escaper');
const storage = require('./storage.js');
const {
	toId
} = require('./utils.js');


let uploadToHastebin = function (toUpload, callback) {
	let https = require("https");
	if (typeof callback !== 'function') return false;
	var reqOpts = {
		hostname: 'pastie.io',
		method: 'POST',
		path: '/documents'
	};

	var req = https.request(reqOpts, function (res) {
		res.on('data', function (chunk) {
			try {
				var filename = JSON.parse(chunk).key;
				callback('https://pastie.io/raw/' + filename);
			} catch (e) {
				if (typeof chunk === 'string' && new RegExp("/^[^\<]*\<!DOCTYPE html\>/").test(chunk)) {
					callback('Cloudflare-related error uploading to Hastebin: ' + e.message);
				} else {
					callback('Unknown error uploading to Hastebin: ' + e.message);
				}
			}
		});
	});
	req.on('error', function (e) {
		callback('Error uploading to Hastebin: ' + e.message);
	});
	req.write(toUpload);
	req.end();
}

const pointcap = 999999999;
const spotlights = {
	16: "Trick House",
	18: "Battle Dome",
	19: "Board Games",
	20: "Game Corner",
	21: "Mafia",
	22: "Scavengers",
	25: "Survivor",
	26: "Trivia",
	27: "Trick house",
	28: "Battle Dome",
	29: "Board Games",
	1: "Game Corner",
	2: "Mafia",
	3: "Scavengers",
	4: "Survivor",
	5: "Trivia"
}

// Max HP for gamers
const maxHP = 0;
const useBoss = false;

let day = new Date(Date.now()).getDate();

module.exports = {
	room: false,
	disabled: false,
	populate: function () {
		for (let i = 1; i < 500; i++) {
			for (let x = 1; x < 150; x++) {
				let username = `Random User ${i}`;
				let userid = toId(username);
				let roomid = toId(Config.GameRooms[Math.floor(Math.random() * Config.GameRooms.length)]);
				let amount = Math.random() * 10 - 7;
				if (amount < 0) amount = 0;
				if (!this.points[roomid][userid]) {
					this.points[roomid][userid] = 0;
				}
				this.points[roomid][userid] += Math.floor(amount);
				console.log(`${amount} points for ${userid} in ${roomid}`);
				this.names[userid] = username;
			}
		}
		this.save();
	},
	load: function () {
		let year = new Date(Date.now()).getFullYear();
		this.names = storage.load(`${year}-names.json`);
		this.points = {}
		this.daypoints = {};
		for (let i of Config.GameRooms) {
			this.points[toId(i)] = storage.load(`${year}-${toId(i)}.json`);
			this.daypoints[toId(i)] = storage.load(`${year}-${toId(i)}-day.json`);
		}
		this.bosshp = storage.load(`${year}-bosshp.json`).hp;
	},
	save: function (roomid = false) {
		let year = new Date(Date.now()).getFullYear();
		for (let i of Config.GameRooms) {
			if (!roomid || toId(i) === toId(roomid)) {
				storage.save(`${year}-${toId(i)}.json`, this.points[toId(i)]);
				storage.save(`${year}-${toId(i)}-day.json`, this.daypoints[toId(i)]);
			}
		}
		storage.save(`${year}-bosshp.json`, {
			hp: this.bosshp
		});
		storage.save(`${year}-names.json`, this.names);
	},
	resetDaily: function () {
		for (let i in this.daypoints) {
			this.daypoints[i] = 0;
		}
		this.save();
	},
	addtrivia: function (data) {
		if (this.disabled) return false;
		data = data.replace("The scores for the last Trivia game are: ", "").split(', ').map(x => [x.split(" ")[0], toId(x.split(" ")[1])]);
		let spotlight = "trivia" === toId(spotlights[day]);

		if (spotlights[day] === true) spotlight = this.bosshp <= 0;
		if (!this.room) return false;

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
		}
		let ret = [];
		for (let i in data) {
			let userid = toId(data[i][0]);
			let amount = Math.ceil(1 * parseInt(data[i][1])); 	// Every official			1 point per 2 triv points (rounded up)
			if (data[i] >= 5) amount += 3; 						// Every other official		3 bonus points upon getting 5 triv points
			if (i == 0) amount += 20; 							// Every official winners	20 / 10 / 5
			if (i == 1) amount += 10;
			if (i == 2) amount += 5;
			if (!this.points.trivia[userid]) {
				this.points.trivia[userid] = 0;
				this.daypoints.trivia[userid] = 0;
			}
			this.points.trivia[userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.daypoints.trivia[userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.bosshp -= roundPoints(amount * (spotlight ? 1.5 : 1));
			if (this.daypoints.trivia[userid] > pointcap.trivia + (spotlight ? 50 : 0)) {
				let differential = this.daypoints.trivia[userid] - pointcap.trivia + (spotlight ? 50 : 0);
				this.points.trivia[userid] -= differential;
				this.daypoints.trivia[userid] -= differential;
			}

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = data[i][0];
			ret.push(`[${userid}] - ${amount}`);
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save("trivia");

		while (ret.length) {
			this.room.send(`/mn Trivia official awarded by [magic]: ${ret.slice(0, 10).join(', ')}`);
			ret = ret.slice(10);
		}
		return true;
	},
	addmafiapoints: function (count, host, winners, losers, source, fish) {
		if (this.disabled) return false;
		if (!this.room) return false;

		if (count > 20) count = 20;
		if (count < 4) return false;
		count -= 4;

		let point_scalings = {
			 win: [9, 12, 14, 16, 18, 21, 23, 25, 27, 30, 32, 34, 46, 39, 41, 43, 45],
			host: [7,  9, 11, 12, 14, 16, 17, 19, 20, 23, 24, 26, 27, 29, 31, 32, 34],
			play: [5,  6,  7,  9,  9, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23]
		}

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
		}

		let spotlight = "mafia" === toId(spotlights[day]);
		if (spotlights[day] === true) spotlight = this.bosshp <= 0;

		let success = true;
		let winner_points = fish ? 60 : point_scalings.win[count];
		let loser_points = fish ? 30 : point_scalings.play[count];
		let host_points = fish ? 0 : point_scalings.host[count];

		let users = [host].concat(winners).concat(losers);
		for (let user of users) {
			let user_points = 0;
			if (host === user) user_points += host_points;
			if (winners.includes(user)) user_points += winner_points;
			if (losers.includes(user)) user_points += loser_points;
			if (!user_points) continue;
			let userid = toId(user);

			if (!this.points.mafia[userid]) {
				this.points.mafia[userid] = 0;
				this.daypoints.mafia[userid] = 0;
			}

			this.points.mafia[userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.daypoints.mafia[userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.bosshp -= roundPoints(amount * (spotlight ? 1.5 : 1));
			if (this.daypoints.mafia[userid] > pointcap.mafia + (spotlight ? 50 : 0)) {
				let differential = this.daypoints.mafia[userid] - pointcap.mafia + (spotlight ? 50 : 0);
				this.points.mafia[userid] -= differential;
				this.daypoints.mafia[userid] -= differential;
			}

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = users[i];
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save("mafia");

		let hoststring = fish ? `Host (${host_points}): [${toId(host)}]. ` : "";
		let winnerstring = `Winners (${winner_points}): ${winners.map(x => "[" + toId(x) + "]").join(', ')}. `;
		let loserstring = `Participants (${loser_points}): ${losers.map(x => "[" + toId(x) + "]").join(', ')}`;

		this.room.send(`/mn Mafia${fish ? " official" : ""} points awarded by [${source}]. ${hoststring}${winnerstring}${loserstring}`)
		return true;
	},
	addhunt: function (hosts, users, type = "addhunt", source) {
		if (this.disabled) return false;
		if (!this.room) return false;

		let point_scalings = {
			"addhunt": [50, 42, 34, 26, 20, 15, 10],
			"addminifishhunt": [70, 60, 50, 40, 30, 25, 20],
			"addfishhunt": [100, 88, 75, 63, 50, 40, 30],
			"addtwisthunt": [150, 135, 120, 95, 80, 65, 40],
			"addodysseyhunt": [200, 175, 150, 125, 100, 80, 50]
		}

		let pointobj = point_scalings[type];

		if (typeof users === "string") users = users.split(',');

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
		}

		let spotlight = "scavengers" === toId(spotlights[day]);
		if (spotlights[day] === true) spotlight = this.bosshp <= 0;

		this.addpoints(46, hosts, "scavengers", source); 

		let ret = [];
		for (let i in users) {
			let userid = toId(users[i]);
			let amount = pointobj[6];
			if (i < 6) amount = pointobj[i];

			if (!this.points.scavengers[userid]) {
				this.points.scavengers[userid] = 0;
				this.daypoints.scavengers[userid] = 0;
			}
			this.points.scavengers[userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.daypoints.scavengers[userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.bosshp -= roundPoints(amount * (spotlight ? 1.5 : 1));
			if (this.daypoints.scavengers[userid] > pointcap.scavengers + (spotlight ? 50 : 0)) {
				let differential = this.daypoints.scavengers[userid] - pointcap.scavengers + (spotlight ? 50 : 0);
				this.points.scavengers[userid] -= differential;
				this.daypoints.scavengers[userid] -= differential;
			}

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = users[i];
			ret.push(`[${userid}] - ${amount}`);
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save("scavengers");

		this.room.send(`/mn Scavenger hunt awarded by [${source}]: ${ret.join(', ')}`);
		return true;
	},
	setpoints: function (amount, users, room, source) {
		if (this.disabled) return false;
		if (!this.room) return false;

		let roomid = toId(room);

		for (let i of Config.GameRooms) {
			if (toId(i) === roomid) room = i;
		}
		if (typeof users === "string") users = users.split(',');
		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
			if (spotlights[now.getDate()]) points.room.send(`/wall Spotlight day for ${spotlights[now.getDate()]} started!`)
		}
		let spotlight = toId(roomid) === toId(spotlights[now.getDate()]);
		if (spotlights[day] === true) spotlight = this.bosshp <= 0;

		for (let i in users) {
			let userid = toId(users[i]);
			this.points[roomid][userid] = amount;

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = users[i];
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save(roomid);
		let users2 = [];
		if ((users.map(x => '[' + toId(x) + ']').join(', ')).length > 250) users2 = users.slice(Math.floor(users.length / 2));
		this.room.send(`/modnote Points set to ${amount} for ${users.map(x => '[' + toId(x) + ']').join(', ')} in ${room} by [${source}]`)
		if (users2.length) this.room.send(`/modnote Points set to ${amount} for ${users2.map(x => '[' + toId(x) + ']').join(', ')} in ${room} by [${source}]`)

		return true;
	},
	setpointsfromjson: function (json, room, source) {
		if (this.disabled) return false;
		if (!this.room) return false;

		let roomid = toId(room);

		for (let i of Config.GameRooms) {
			if (toId(i) === roomid) room = i;
		}
		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
			if (spotlights[now.getDate()]) points.room.send(`/wall Spotlight day for ${spotlights[now.getDate()]} started!`)
		}
		let spotlight = toId(roomid) === toId(spotlights[now.getDate()]);
		if (spotlights[day] === true) spotlight = this.bosshp <= 0;

		try {
			json = JSON.parse(json);
		}
		catch (e) {
			this.room.send(`/modnote [${source}] gave invalid json for room ${roomid}`);
			return false;
		}

		for (let i in json) {
			let userid = toId(i);
			this.points[roomid][userid] = json[i];

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = i;
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save(roomid);
		let users = Object.keys(json).map(toId);
		while (users.length) {
			let part = users.slice(0, 10);
			users = users.slice(10);

			this.room.send(`/modnote Points manually updated for ${part.map(x => '[' + toId(x) + ']').join(', ')} in ${room} by [${source}]`)
		}
		return true;
	},
	addpoints: function (amount, users, room, source) {
		if (this.disabled) return false;
		if (!this.room) return false;

		let roomid = toId(room);
		for (let i of Config.GameRooms) {
			if (toId(i) === roomid) room = i;
		}
		if (typeof users === "string") users = users.split(',');

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
			if (spotlights[now.getDate()]) points.room.send(`/wall Spotlight day for ${spotlights[now.getDate()]} started!`)
		}
		let spotlight = toId(roomid) === toId(spotlights[now.getDate()]);
		if (spotlights[day] === true) spotlight = this.bosshp <= 0;

		for (let i in users) {
			let userid = toId(users[i]);
			if (!this.points[roomid][userid]) {
				this.points[roomid][userid] = 0;
				this.daypoints[roomid][userid] = 0;
			}
			this.points[roomid][userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.daypoints[roomid][userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			if (this.bosshp > 0) this.bosshp -= roundPoints(amount * (spotlight ? 1.5 : 1));
			if (this.daypoints[roomid][userid] > pointcap[roomid] + (spotlight ? 50 : 0)) {
				let differential = this.daypoints[roomid][userid] - pointcap[roomid] + (spotlight ? 50 : 0);
				this.points[roomid][userid] -= differential;
				this.daypoints[roomid][userid] -= differential;
			}

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = users[i];
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save(roomid);
		let users2 = [];
		if ((users.map(x => '[' + toId(x) + ']').join(', ')).length > 250) users2 = users.slice(Math.floor(users.length / 2));
		this.room.send(`/modnote ${roundPoints(amount * (spotlight ? 1.5 : 1))} point${amount === 1 ? "" : "s"} given to ${users.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		if (users2.length) this.room.send(`/modnote ${roundPoints(amount * (spotlight ? 1.5 : 1))} point${amount === 1 ? "" : "s"} given to ${users2.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		return true;
	},
	/*addauthhunt: function (amount, users, room, source) { Deprecated
		if (this.disabled) return false;
		if (!this.room) return false;

		amounts = [4, 8];

		let rooms = [toId(room), "survivor"];
		for (let i of Config.GameRooms) {
			if (toId(i) === toId(room)) room = i;
		}
		if (typeof users === "string") users = users.split(',');

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
			if (spotlights[now.getDate()]) points.room.send(`/wall Spotlight day for ${spotlights[now.getDate()]} started!`)
		}
		for (let num in rooms) {
			let roomid = rooms[num];
			let amount = amounts[num];
			let spotlight = toId(roomid) === toId(spotlights[now.getDate()]);
			if (spotlights[day] === true) spotlight = this.bosshp <= 0;

			spotlight = false;

			for (let i in users) {
				let userid = toId(users[i]);
				if (!this.points[roomid][userid]) {
					this.points[roomid][userid] = 0;
					this.daypoints[roomid][userid] = 0;
				}
				this.points[roomid][userid] += amount;
				this.daypoints[roomid][userid] += amount;
				if (this.bosshp > 0) this.bosshp -= amount;
				if (this.daypoints[roomid][userid] > pointcap[roomid] + (spotlight ? 50 : 0)) {
					let differential = this.daypoints[roomid][userid] - pointcap[roomid] + (spotlight ? 50 : 0);
					this.points[roomid][userid] -= differential;
					this.daypoints[roomid][userid] -= differential;
				}

				if (Users[userid]) this.names[userid] = Users[userid].name
				if (!this.names[userid]) this.names[userid] = users[i];
			}

			if (this.bosshp < 0) this.bosshp = 0;
			this.save(roomid);
		}
		this.room.send(`/modnote ${amounts.join(", ")} auth hunt points given to ${users.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		return true;
	},*/
	addeventpoints: function (amount, users, room, source) {
		if (this.disabled) return false;
		if (!this.room) return false;

		roomid = toId(room);
		for (let i of Config.GameRooms) {
			if (toId(i) === roomid) room = i;
		}
		if (typeof users === "string") users = users.split(',');

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
		}
		let spotlight = false;
		for (let i in users) {
			let userid = toId(users[i]);
			if (!this.points[roomid][userid]) {
				this.points[roomid][userid] = 0;
				this.daypoints[roomid][userid] = 0;
			}
			this.points[roomid][userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			this.daypoints[roomid][userid] += roundPoints(amount * (spotlight ? 1.5 : 1));
			if (this.bosshp > 0) this.bosshp -= amount;
			if (this.daypoints[roomid][userid] > pointcap[roomid] + (spotlight ? 50 : 0)) {
				let differential = this.daypoints[roomid][userid] - pointcap[roomid] + (spotlight ? 50 : 0);
				this.points[roomid][userid] -= differential;
				this.daypoints[roomid][userid] -= differential;
			}

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = users[i];
		}

		if (this.bosshp < 0) this.bosshp = 0;

		this.save(roomid);

		let users2 = [];
		if ((users.map(x => '[' + toId(x) + ']').join(', ')).length > 250) users2 = users.slice(Math.floor(users.length / 2));
		this.room.send(`/modnote ${amount} point${amount === 1 ? "" : "s"} given to ${users.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		if (users2.length) this.room.send(`/modnote ${amount} point${amount === 1 ? "" : "s"} given to ${users2.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		return true;
	},
	buildTotalBoard() {
		let scores = [];
		for (let i in this.names) {
			let pscores = {
				battledome: this.points.battledome[i] || 0,
				boardgames: this.points.boardgames[i] || 0,
				gamecorner: this.points.gamecorner[i] || 0,
				mafia: this.points.mafia[i] || 0,
				scavengers: this.points.scavengers[i] || 0,
				survivor: this.points.survivor[i] || 0,
				trickhouse: this.points.trickhouse[i] || 0,
				trivia: this.points.trivia[i] || 0,
			}

			let sobj = Object.values(pscores);
			sobj.sort((a, b) => b - a);
			let weighted = roundPoints(sobj[0] + sobj[1] * 1.2 + sobj[2] * 1.4 + sobj[3] * 1.6 + sobj[4] * 1.8 + sobj[5] * 2.0 + sobj[6] * 2.2 + sobj[7] * 2.4);
			let total = sobj[0] + sobj[1] + sobj[2] + sobj[3] + sobj[4] + sobj[5] + sobj[6] + sobj[7];

			scores.push([
				i,
				weighted,
				total,
				pscores.battledome,
				pscores.boardgames,
				pscores.gamecorner,
				pscores.mafia,
				pscores.scavengers,
				pscores.survivor,
				pscores.trickhouse,
				pscores.trivia
			]);
		}
		scores.sort((a, b) => b[1] - a[1]);

		let bosshp = Math.floor(this.bosshp / maxHP * 100);
		let ret = `<div style="width:100%;height:100%;background:rgba(100, 180, 255, 0.1);overflow:auto">`;

		ret += `<center style="margin:70px">`
		if (useBoss) {
			ret += `<h2>Gamer God</h2>`
			ret += `<div style="background:rgb(160, 160, 160);width:100%;height:32px;overflow:hidden;color:black">`
			ret += `<div style="background:rgb(255, 120, 120);width:${bosshp}%;height:32px;overflow:visible;float:left;padding:6px;font-size:16px"><div style="width:800px;height:32px;text-align:left">${this.bosshp}/${maxHP} HP</div></div></div>`;

			ret += `Every point you gain deals 1 damage to the Gamer God. If the Gamer God is defeated by the 17th, 18th, and 19th of March, all rooms have a spotlight for those days, increasing point gains!<hr>`
		}

		for (let i of Config.GameRooms) {
			ret += `<button class="button" name="send" value="/msgroom ${Config.hubroom}, /botmsg ${Config.username}, global, leaderboard ${toId(i)}">${i}</button>`;
		}

		ret += `<br><button class="button disabled">Ultimate Gaming Olympics</button>`;

		ret += `<hr><h1>Leaderboard for Ultimate Gaming Olympics</h1>`
		ret += `<div style="overflow:auto;height:70vh"><table style="width:1000px;text-align:center" cellpadding="5" border="1">`;
		ret += `<tr style="background-color:rgba(140,140,140,0.3)"><th>#</th><th style="width:120px">Name</th><th>Points</th><th>Total Points</th>`
		ret += `<th>Battle Dome Points</th><th>Board Games Points</th><th>Game Corner Points</th><th>Mafia Points</th><th>Scavengers Points</th><th>Survivor Points</th><th>Trick House Points</th><th>Trivia Points</th></tr>`
		for (let i in scores) {
			if (i == 500) break;
			let id = scores[i][0];
			let name = escape(this.names[id]);
			let pts = scores[i][1];
			ret += `<tr><td>${parseInt(i)+1}</td><td>${name}</td><td>${pts}</td><td>${scores[i][2]}</td>`
			ret += `<td>${scores[i][3]}</td><td>${scores[i][4]}</td><td>${scores[i][5]}</td><td>${scores[i][6]}</td><td>${scores[i][7]}</td>`
			ret += `<td>${scores[i][8]}</td><td>${scores[i][9]}</td><td>${scores[i][10]}</td></tr>`;
		}
		ret += `</table></div></center></div>`;
		return ret;
	},
	exportLeaderboard: function(room) {
		let scores = [];
		for (let i in this.names) {
			let pscores = {
				battledome: this.points.battledome[i] || 0,
				boardgames: this.points.boardgames[i] || 0,
				gamecorner: this.points.gamecorner[i] || 0,
				mafia: this.points.mafia[i] || 0,
				scavengers: this.points.scavengers[i] || 0,
				survivor: this.points.survivor[i] || 0,
				trickhouse: this.points.trickhouse[i] || 0,
				trivia: this.points.trivia[i] || 0,
			}

			let sobj = Object.values(pscores);
			sobj.sort((a, b) => b - a);
			let weighted = roundPoints(sobj[0] + sobj[1] * 1.2 + sobj[2] * 1.4 + sobj[3] * 1.6 + sobj[4] * 1.8 + sobj[5] * 2.0 + sobj[6] * 2.2 + sobj[7] * 2.4);
			let total = sobj[0] + sobj[1] + sobj[2] + sobj[3] + sobj[4] + sobj[5] + sobj[6] + sobj[7];

			scores.push([
				i,
				weighted,
				total,
				pscores.battledome,
				pscores.boardgames,
				pscores.gamecorner,
				pscores.mafia,
				pscores.scavengers,
				pscores.survivor,
				pscores.trickhouse,
				pscores.trivia
			]);
		}
		scores.sort((a, b) => b[1] - a[1]);
		
		let fill = function(str, len, char = " ") {
			str = str.toString();
			while (str.length < len) str = char + str;
			return str;
		}

		let ret = "";
		ret += "+------+---------------------+-------+-------+-------+-------+-------+-------+-------+-------+-------+-------+\n";
		ret += "|    # |              userid | Struc | Total |    BD |    BG |    GC | Mafia | Scavs |  Surv |    TH |  Triv |\n";
		ret += "+------+---------------------+-------+-------+-------+-------+-------+-------+-------+-------+-------+-------+\n";

		for (let i = 0; i < scores.length; i++) {
			let r = scores[i];
			ret += `| ${fill(i+1, 4)} `;
			ret += `| ${fill(r[0], 19)} `;
			for (let x = 1; x < r.length; x++) {
				ret += `| ${fill(r[x], 5)} `;
			}
			ret += "|\n";
		}
		ret += "+------+---------------------+-------+-------+-------+-------+-------+-------+-------+-------+-------+-------+"
		uploadToHastebin(JSON.stringify(scores, null, 2), function(res1) {
			uploadToHastebin(ret, function(res2) {
				room.send(`${res1} ${res2}`);
			})
		})
	},
	buildLeaderboard: function (roomid = false) {
		let scores = [];
		if (!roomid || getRoomName(roomid) === roomid) {
			return this.buildTotalBoard();
		}
		for (let i in this.points[roomid]) {
			if (this.points[roomid] === 0) continue;
			scores.push([
				i,
				this.points[roomid][i]
			]);
		}

		scores.sort((a, b) => b[1] - a[1]);

		let ret = `<div style="width:100%;height:100%;background:rgba(100, 180, 255, 0.1);overflow:auto">`;
		ret += `<center style="margin:70px">`

		for (let i of Config.GameRooms) {
			if (toId(i) === roomid) ret += `<button class="button disabled">${i}</button>`;
			else ret += `<button class="button" name="send" value="/msgroom ${Config.hubroom}, /botmsg ${Config.username}, global, leaderboard ${toId(i)}">${i}</button>`;
		}
		ret += `<br><button class="button" name="send" value="/msgroom ${Config.hubroom}, /botmsg ${Config.username}, global, leaderboard">Ultimate Gaming Olympics</button>`;

		ret += `<hr><h1>Leaderboard for ${getRoomName(roomid)}</h1>`
		ret += `<table style="border-spacing: 0px; border-collapse: collapse;border:1px solid black;width:100%" border="1">`;
		ret += `<tr style="background-color:rgba(140,140,140,0.3)"><th>#</th><th>Name</th><th>Points</th></tr>`
		for (let i in scores) {
			let id = scores[i][0];
			let name = escape(this.names[id]);
			let pts = scores[i][1];
			ret += `<tr><td>${parseInt(i)+1}</td><td>${name}</td><td>${pts}</td></tr>`;
		}
		ret += `</table></center></div>`;
		return ret;
	}
}
