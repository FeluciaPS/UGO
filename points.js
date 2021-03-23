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

let escape = require('html-escape');
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
	1: "Battle Dome",
	2: "Mafia",
	3: "Scavengers",
	4: "Survivor",
	5: "Game Corner",
	8: "Battle Dome",
	9: "Trivia",
	10: "Mafia",
	11: "Scavengers",
	12: "Survivor",
	15: "Game Corner",
	16: "Trivia",
	17: true,
	18: true,
	19: true,
}

// Max HP for gamers
const maxHP = 300000;

let day = new Date(Date.now()).getDate();

module.exports = {
	room: false,
	populate: function () {
		for (let i = 1; i < 150; i++) {
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
		this.names = storage.load('names.json');
		this.points = {}
		this.daypoints = {};
		for (let i of Config.GameRooms) {
			this.points[toId(i)] = storage.load(`${toId(i)}.json`);
			this.daypoints[toId(i)] = storage.load(`${toId(i)}-day.json`);
		}
		this.bosshp = storage.load('bosshp.json').hp;
	},
	save: function (roomid = false) {
		for (let i of Config.GameRooms) {
			if (!roomid || toId(i) === toId(roomid)) {
				storage.save(`${toId(i)}.json`, this.points[toId(i)]);
				storage.save(`${toId(i)}-day.json`, this.daypoints[toId(i)]);
			}
		}
		storage.save('bosshp.json', {
			hp: this.bosshp
		});
		storage.save('names.json', this.names);
	},
	resetDaily: function () {
		for (let i in this.daypoints) {
			this.daypoints[i] = 0;
		}
		this.save();
	},
	addtrivia: function (data) {
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
			let amount = Math.ceil(1 * parseInt(data[i][1]));

			if (!this.points.trivia[userid]) {
				this.points.trivia[userid] = 0;
				this.daypoints.trivia[userid] = 0;
			}
			this.points.trivia[userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			this.daypoints.trivia[userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			this.bosshp -= Math.floor(amount * (spotlight ? 1.5 : 1));
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
	addhunt: function (users, mult = 1, source) {
		if (!this.room) return false;

		let next = 40;

		if (typeof users === "string") users = users.split(',');

		if (this.bosshp === undefined) this.bosshp = maxHP;

		let now = new Date(Date.now());
		if (now.getDate() != day) {
			this.resetDaily();
			day = now.getDate();
		}
		let spotlight = "scavengers" === toId(spotlights[day]);
		if (spotlights[day] === true) spotlight = this.bosshp <= 0;
		let ret = [];
		for (let i in users) {
			let userid = toId(users[i]);
			let amount = Math.ceil((next > 0 ? next : 3) * mult);
			if (i == 0) amount = 30;

			if (!this.points.scavengers[userid]) {
				this.points.scavengers[userid] = 0;
				this.daypoints.scavengers[userid] = 0;
			}
			this.points.scavengers[userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			this.daypoints.scavengers[userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			this.bosshp -= Math.floor(amount * (spotlight ? 1.5 : 1));
			if (this.daypoints.scavengers[userid] > pointcap.scavengers + (spotlight ? 50 : 0)) {
				let differential = this.daypoints.scavengers[userid] - pointcap.scavengers + (spotlight ? 50 : 0);
				this.points.scavengers[userid] -= differential;
				this.daypoints.scavengers[userid] -= differential;
			}

			if (Users[userid]) this.names[userid] = Users[userid].name
			if (!this.names[userid]) this.names[userid] = users[i];
			ret.push(`[${userid}] - ${amount}`);
			next -= 5;
		}

		if (this.bosshp < 0) this.bosshp = 0;
		this.save("scavengers");

		this.room.send(`/mn Scavenger hunt awarded by [${source}]: ${ret.join(', ')}`);
		return true;
	},
	addpoints: function (amount, users, room, source) {
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
			this.points[roomid][userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			this.daypoints[roomid][userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			if (this.bosshp > 0) this.bosshp -= Math.floor(amount * (spotlight ? 1.5 : 1));
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
		this.room.send(`/modnote ${Math.floor(amount * (spotlight ? 1.5 : 1))} point${amount === 1 ? "" : "s"} given to ${users.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		if (users2.length) this.room.send(`/modnote ${Math.floor(amount * (spotlight ? 1.5 : 1))} point${amount === 1 ? "" : "s"} given to ${users2.map(x => '[' + toId(x) + ']').join(', ')} for ${room} by [${source}]`)
		return true;
	},
	addeventpoints: function (amount, users, room, source) {
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
			this.points[roomid][userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
			this.daypoints[roomid][userid] += Math.floor(amount * (spotlight ? 1.5 : 1));
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
				battledome: this.points.battledome[i] ? this.points.battledome[i] : 0,
				gamecorner: this.points.gamecorner[i] ? this.points.gamecorner[i] : 0,
				mafia: this.points.mafia[i] ? this.points.mafia[i] : 0,
				scavengers: this.points.scavengers[i] ? this.points.scavengers[i] : 0,
				survivor: this.points.survivor[i] ? this.points.survivor[i] : 0,
				trivia: this.points.trivia[i] ? this.points.trivia[i] : 0,
			}

			let sobj = Object.values(pscores);
			sobj.sort((a, b) => b - a);
			let weighted = Math.floor(sobj[0] + sobj[1] * 1.2 + sobj[2] * 1.4 + sobj[3] * 1.6 + sobj[4] * 1.8 + sobj[5] * 2.0);
			let total = sobj[0] + sobj[1] + sobj[2] + sobj[3] + sobj[4] + sobj[4];

			scores.push([
				i,
				weighted,
				total,
				pscores.battledome,
				pscores.gamecorner,
				pscores.mafia,
				pscores.scavengers,
				pscores.survivor,
				pscores.trivia
			]);
		}
		scores.sort((a, b) => b[1] - a[1]);

		let bosshp = Math.floor(this.bosshp / maxHP * 100);
		let ret = `<div style="width:100%;height:100%;background:rgba(100, 180, 255, 0.1);overflow:auto">`;

		ret += `<center style="margin:70px">`
		ret += `<h2>Gamer God</h2>`
		ret += `<div style="background:rgb(160, 160, 160);width:100%;height:32px;overflow:hidden;color:black">`
		ret += `<div style="background:rgb(255, 120, 120);width:${bosshp}%;height:32px;overflow:visible;float:left;padding:6px;font-size:16px"><div style="width:800px;height:32px;text-align:left">${this.bosshp}/${maxHP} HP</div></div></div>`;

		ret += `Every point you gain deals 1 damage to the Gamer God. If the Gamer God is defeated by the 17th, 18th, and 19th of March, all rooms have a spotlight for those days, increasing point gains!<hr>`

		for (let i of Config.GameRooms) {
			ret += `<button class="button" name="send" value="/join view-bot-ugo-${toId(i)}board">${i}</button>`;
		}
		ret += `<br><button class="button disabled">Ultimate Gaming Olympics</button>`;

		ret += `<hr><h1>Leaderboard for Ultimate Gaming Olympics</h1>`
		ret += `<div style="overflow:auto;height:70vh"><table style="width:1000px;text-align:center" cellpadding="5" border="1">`;
		ret += `<tr style="background-color:rgba(140,140,140,0.3)"><th>#</th><th style="width:120px">Name</th><th>Points</th><th>Total Points`
		ret += `<th>Battle Dome Points</th><th>Game Corner Points</th><th>Mafia Points</th><th>Scavengers Points</th><th>Survivor Points</th><th>Trivia Points</th></tr>`
		for (let i in scores) {
			if (i == 750) break;
			let id = scores[i][0];
			let name = escape(this.names[id]);
			let pts = scores[i][1];
			ret += `<tr><td>${parseInt(i)+1}</td><td>${name}</td><td>${pts}</td><td>${scores[i][2]}</td>`
			ret += `<td>${scores[i][3]}</td><td>${scores[i][4]}</td><td>${scores[i][5]}</td><td>${scores[i][6]}</td><td>${scores[i][7]}</td><td>${scores[i][8]}</td></tr>`;
		}
		ret += `</table></div></center></div>`;
		return ret;
	},
	exportLeaderboard: function(room) {
		let scores = [];
		for (let i in this.names) {
			let pscores = {
				battledome: this.points.battledome[i] ? this.points.battledome[i] : 0,
				gamecorner: this.points.gamecorner[i] ? this.points.gamecorner[i] : 0,
				mafia: this.points.mafia[i] ? this.points.mafia[i] : 0,
				scavengers: this.points.scavengers[i] ? this.points.scavengers[i] : 0,
				survivor: this.points.survivor[i] ? this.points.survivor[i] : 0,
				trivia: this.points.trivia[i] ? this.points.trivia[i] : 0,
			}

			let sobj = Object.values(pscores);
			sobj.sort((a, b) => b - a);
			let weighted = Math.floor(sobj[0] + sobj[1] * 1.2 + sobj[2] * 1.4 + sobj[3] * 1.6 + sobj[4] * 1.8 + sobj[5] * 2.0);
			let total = sobj[0] + sobj[1] + sobj[2] + sobj[3] + sobj[4] + sobj[4];

			scores.push([
				i,
				weighted,
				total,
				pscores.battledome,
				pscores.gamecorner,
				pscores.mafia,
				pscores.scavengers,
				pscores.survivor,
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
		ret += "+-----+---------------------+-------+-------+-------+-------+-------+-------+-------+-------+\n";
		ret += "|   # |            username | Struc | Total |    BD |    GC | Mafia | Scavs |  Surv |  Triv |\n";
		ret += "+-----+---------------------+-------+-------+-------+-------+-------+-------+-------+-------+\n";

		for (let i = 0; i < scores.length; i++) {
			let r = scores[i];
			ret += `| ${fill(i+1, 3)} `;
			ret += `| ${fill(r[0], 19)} `;
			for (let x = 1; x < r.length; x++) {
				ret += `| ${fill(r[x], 5)} `;
			}
			ret += "|\n";
		}
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
			else ret += `<button class="button" name="send" value="/join view-bot-ugo-${toId(i)}board">${i}</button>`;
		}
		ret += `<br><button class="button" name="send" value="/join view-bot-ugo-leaderboard">Ultimate Gaming Olympics</button>`;

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