let {unescape} = require('html-escaper');

global.lastHunt = false;


let parseScavsHunt = function(data) {
	let huntEnd = data.match(/^<div class="broadcast-blue"><strong>The (?:(?:regular|official|practice|recycled|unrated|mini) )?[sS]cavenger [hH]unt (?:by ((?=<em>)<em>.*<\/em>|.*) )?was ended/);
	let hunt = {};
	if (huntEnd) {
		let [res, huntText] = data.split('<details style="cursor: pointer;">');
		let makerText = res.match(/The (.*?) ?[sS]cavenger [hH]unt (?:by (.*?) )?was ended/)[2];
		let tempMaker = hunt.makers;
		hunt.makers = (makerText || '').match(/(?<=<em>).+?(?=<\/em>)/g)
		if (hunt.makers) hunt.makers = hunt.makers.map(match => toId(unescape(match))) || [toId(unescape(makerText))];
		if (makerText && makerText.includes(' and ') && timestamp < 1621755253153n) {
			hunt.makers = makerText.split(' and ').map(t => t.split(',')).flat().map(u => toId(unescape(u)));
		}
		hunt.finishers = [];
		if (!hunt.makers.join('')) {
			hunt.makers = tempMaker;
			(res.match(/(?<=\d(?:st|nd|rd|th) place: |Consolation Prize: )((?:<em>)?[^<]+?(?:<\/em>)?(?:<span style="[^"]+?">\[[\d:]+\]<\/span>)?)+(?=<br)/g) || []).forEach(match => {
				match.split(', ').forEach(m => {
					let time = (m.match(/(?<=<span style="color: [^"]+">\[)((?:\d{2}:)?\d{2}:\d{2})(?=\])/));
					if (time) time = (time[0].split(':').map(n => ~~n).reverse().reduce((acc, val, index) => acc + val * [1, 60, 60, 24].slice(0, index + 1).reduce((a, b) => a * b, 1), 0) * 1000) || undefined;
					if (time) m = m;
					let user = toId(unescape(m.replace(/<span.*<\/span>/g, '').replace(/<[^>]*>/g, '')));
					hunt.finishers.push({ user: user, time: time });
				});
			});
		}
		else {
			let x = res.match(/<em>[^<>]*?<\/em> <span style="color: lightgreen;">\[(?:\d{2}:){0,2}\d{2}:\d{2}\]<\/span>/g)
			if (x) x.forEach(hit => {
				let m = hit.match(/(?<=<em>).*?(?=<\/em>)/);
				let user = toId(unescape(m[0]));
				let time = hit.match(/(?<=>)\[(?:\d{2}:){0,2}\d{2}:\d{2}\](?=<)/)
				if (time) time = time[0].split(':').reverse().reduce((acc, val, index) => acc + ~~toId(val) * [1, 60, 60, 24].slice(0, index + 1).reduce((a, b) => a * b, 1), 0);
				else time = 0;
				hunt.finishers.push({ user: user, time: time * 1000 });
			});
		}
		return hunt;
	}
	return false;
}

// Code by PartMan, I don't understand the majority of it, not my fault if it doesn't work

bot.on('raw', (parts) => {
	let room = Rooms[Utils.getRoom(parts[0])];
	if (!room) {
		return;
	}
	if (room.id !== "scavengers") {
		return;
	}
	let data = parts.slice(2).join('|');
	let hunt = parseScavsHunt(data);
	if (hunt) 
		lastHunt = hunt;
});

module.exports = {
	viewlasthunt: function (room, user, args) {
		console.log(lastHunt);
		if (!lastHunt)
			return points.room.send(`/sendhtmlpage ${user.id}, test, No hunt recorded`);
		
		let hunt = lastHunt;
		let ret = "";
		ret += `${hunt.makers.join(', ')}<hr>`;
		ret += `${hunt.finishers.map(x => x.user).join('<br>')}`;
		points.room.send(`/sendhtmlpage ${user.id}, test, ${ret}`);
	},
	addminifishhunt: 'addhunt',
	addfishhunt: 'addhunt',
	addtwisthunt: 'addhunt',
	addhunt: function (room, user, args, val, time, cmd) {
		if (!user.can(points.room, '%')) return;
		if (!lastHunt) return user.send("No recent hunt is recorded, possibly due to a bot restart. Please add points manually");
		let res = points.addhunt(lastHunt.makers, lastHunt.finishers.map(x => x.user), cmd, user.id);
		if (!res) return user.send("Something went wrong...");
		return user.send('Points successfully given.');
	},
}
