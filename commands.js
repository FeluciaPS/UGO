let commands = {
    // Utilities
	th: 'tourhistory',
	tourhistory: function(room, user, args) {
		if (!user.can(room, '+')) return;
		if (!room.pasttours.length) return room.send("This room has no past tours recorded.");
		room.send("**Tour history** (most recent first): " + room.pasttours.reverse().join(', '));
		room.pasttours.reverse();
	},
	lasttour: function(room, user, args) {
		if (!user.can(room, '+')) return;
		if (!room.lasttour[0]) return room.send("This room has no past tours recorded.");
		let ago = Math.floor((Date.now() - room.lasttour[0]) / 60000);
		return room.send(`**${room.lasttour[1]}** ${ago} minute${ago === 1 ? '' : 's'} ago.`);
	},
    mail: function(room, user, args, val) {
        if (!user.can(" ")) return;
        let target = args[0];
        let targetid = toId(target);
        let msg = val.substring(target.length + 1).trim();
        if (args.length < 2 || !targetid || !msg) return user.send("Usage: ``" + Config.char + "mail [user], [message]``");
        let message = `[mail] ${user.name}: ${msg}`;
        if (message.length > 300) return user.send("Your message is too long...");
        if (Users[targetid]) return Users[targetid].send(message);
        FS.readFile(`mail/${targetid}.json`, (err, data) => {
            let maildata = [];
            if (err) {}
            else {
                try { maildata = JSON.parse(data); }
                catch (e) { };
            }
            if (maildata.length === Config.mail.inboxSize) return user.send("That user's mailbox is full.");
            maildata.push(message);
            FS.writeFile(`mail/${targetid}.json`, JSON.stringify(maildata, null, 4), (err) => {
                if (err) throw err;
                user.send("Mail sent successfully.");
            });
        });
    },
    
    modnote: function(room, user, args, val) {
        if (room != user) return;
        if (!args[0]) return user.send(Utils.errorCommand('modnote [room], [message]'));
        room = Utils.toRoomId(args[0]);
        if (!Rooms[room]) return user.send("Room doesn't exist, or I'm not in it");
        let self = Users[toId(Config.username)];
        if (self.rooms[room] != "*") return user.send("I'm not a bot in that room");
        if (!user.can(room, "%")) return user.send('Access denied.');
        let escape = require('escape-html');
        let msg = val.substring(args[0].length + 1).trim();
        if (Config.devs.indexOf(user.id) == -1) msg = escape(msg);
        let ret = `/addrankhtmlbox %,<b>${escape(user.rooms[room])}${user.name}:</b> ${msg}<br><span style='color:#444444;font-size:10px'>Note: Only users ranked % and above can see this.</span>`
        Send(room, ret);
    },
    // Dev stuff
    git: function(room, user, args) {
        let target = user.can(room, '+') ? room : user;
        if (!target) target = user;
        let msg = "No git url is configured for this bot."
        if (Config.git) msg = Config.git;
        target.send(msg);
    },

    rl: 'reload',
    reload: function(room, user, args) {
        if (!user.can(room, 'all')) return;
        bot.emit('reload', args[0], room);
    },
    
    update: function(room, user, args) {
        if (!user.can(room, 'all')) return;
        if (!Config.git) return room.send("No git url is configured for this bot.");
        const child_process = require('child_process');
        child_process.execSync('git pull ' + Config.git + ' master', {stdio: 'inherit'});
        room.send("Code updated to the latest version.");
    },
    
    js: 'eval',
    eval: function(room, user, args, val) {
        if (!user.can(room, 'all')) return;
        if (!room) room = user;
        if (!val) return;
        try {
			let ret = eval(val);
			if (ret !== undefined) {
				ret = ret.toString();
				if (ret.indexOf("\n") !== -1) ret = "!code " + ret;
				room.send(JSON.stringify(ret));
			}
		}
		catch (e) {
			room.send(e.name + ": " + e.message);
		}
    },
    
    ping: function(room, user, args) {
        if (!user.can(room, 'all')) return; 
        if (!room) room = user;
        room.send("pong!");
    },
    
    join: 'joinroom',
    joinroom: function(room, user, args) {
        if (!user.can(room, 'all')) return;
        if (!args[0]) return user.send('No room given.');
        Send('', '/j ' + args[0]);
    }
};

let files = FS.readdirSync('commands');
for (let f in files) {
    let file = files[f];
    if (file.substring(file.length-3) !== ".js") continue;
    if (require.cache[require.resolve('./commands/' + file)]) delete require.cache[require.resolve('./commands/' + file)];
    let contents = require('./commands/' + file);
    Object.assign(commands, contents);
}

module.exports = commands;