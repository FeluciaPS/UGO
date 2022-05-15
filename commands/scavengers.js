let {unescape} = require('html-escaper');

let lastHunt = false;

// Code by PartMan, I don't understand the majority of it, not my fault if it doesn't work
let parseScavsHunt = function (data) {
    // Hunts
    if (/^<div class="broadcast-blue"><strong>The (?:regular|official|practice|recycled|unrated|mini) scavenger hunt by [^<>]*? was ended/.test(data)) {
        // Hunt ended
        let [res] = data.split('<details style="cursor: pointer;">');
        let intro = res.match(/The (.*?) scavenger hunt by (.*?) was ended/);
        let huntType = intro[1], huntmaker = intro[2];
        let finishers = [], questions = [], hunt = {};

        let t = res.match(/<em>.*?<\/em> <span style="color: lightgreen;">\[(?:\d{2}:){0,2}\d{2}:\d{2}\]<\/span>/g)
		if (t) t.forEach(hit => {
			let usermatch = hit.match(/(?<=<em>).*?(?=<\/em>)/)
			if (usermatch) usermach = usermatch[0];
            let user = toId(unescape(usermatch));
            let time = hit.match(/(?<=>)\[(?:\d{2}:){0,2}\d{2}:\d{2}\](?=<)/)
			if (time) time = time[0].split(':').reverse().reduce((acc, val, index) => acc + ~~toId(val) * [1, 60, 60, 24].slice(0, index + 1).reduce((a, b) => a * b, 1), 0);
            finishers.push({ user: user, time: time * 1000 });
        });

        hunt.type = huntType;
        hunt.maker = huntmaker;
        hunt.finishers = finishers;
        return hunt;
    }
    return false;
}

bot.on('raw', (parts) => {
	let room = Rooms[Utils.getRoom(parts[0])];
	if (!room)
		return;
	if (room.id !== "scavengers") return;
	let data = parts.slice(2).join('|');
	let hunt = parseScavsHunt(parts);
	if (hunt) 
		lastHunt = hunt;
});

exports.commands = {
	viewlasthunt: function (room, user, args) {
		let ret = "";
		ret += `${hunt.type}<br>`;
		ret += `${hunt.maker}<hr>`;
		ret += `${hunt.finishers.map(x => x.user).join('<br>')}`;
		points.room.send(`/sendhtmlpage ${user.id}, ${test}, ${ret}`);
	}
}