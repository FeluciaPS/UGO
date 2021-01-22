let formats = {};

class Tournament {
    constructor(room, type) {
        this.room = room;
        this.started = false;
        this.players = {};
        this.chill = type === 'chill';
		this.name = false;
		this.format = false;
        let tourcheck = room.id
        if (type === "late") {
            this.started = true;
			return;
			this.format = 'unknown';
		}
        if (Config.tours[tourcheck]) {
            let t = Config.tours[tourcheck];
    		if (t[0]) {
    		    this.room.send(`/tour autostart ${t[0]}`);
    		    this.room.send(`/tour autodq ${t[1]}`);
    		}
            if (t[2]) this.room.send('/tour scouting disallow');
        }
        else if (Config.tours[room.id]) {
            let t = Config.tours[room.id];
            this.room.send(`/tour autostart ${t[0]}`);
            this.room.send(`/tour autodq ${t[1]}`);
            if (t[2]) this.room.send('/tour scouting disallow');
        }
        if (this.chill) room.send('/modchat +');
    }
    

    end(data) {
		if (data) {
			let dt = JSON.parse(data);
			if (dt.format && formats[dt.format]) this.name = formats[dt.format];
			else this.name = dt.format ? dt.format : this.name;
		}
        if (this.chill) this.room.send('/modchat off');
    }
}

Tournament.prototype.toString = function() {
	if (this.name) return this.name;
	if (this.format) return this.format === 'unknown' ? false : this.format;
	return false;
}
module.exports = {
	Tournament: Tournament,
	formats: formats
}
