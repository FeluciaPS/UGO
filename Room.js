class Room {
    constructor(id) {
        this.users = {};
        this.id = id;
        this.tournament = false;
        this.pasttours = [];
        this.lasttour = [false, false];
        this.loadSettings();
    }

    loadSettings() {
        const PATH = `./rooms/${this.id}.json`;
        if (!FS.existsSync(PATH)) FS.copyFileSync('./rooms/config-example.json', PATH);
        this.settings = JSON.parse(FS.readFileSync(PATH));
        this.repeat = this.settings.repeat;
        if (this.settings.pasttours) {
            this.pasttours = this.settings.pasttours;
        }
    }

    saveSettings(load = false) {
        const PATH = `./rooms/${this.id}.json`;
        this.settings.repeat = this.repeat;
        this.settings.pasttours = this.pasttours;
        let settings = JSON.stringify(this.settings, null, 4);
        FS.writeFileSync(PATH, settings);
        if (load) this.loadSettings();
    }

    send(message) {
        if (this.settings.disabled) return;
        if (typeof message === typeof {}) {
            for (let i in message) {
                Send(this.id, message[i]);
            }
            return;
        }
        Send(this.id, message);
    }

    runChecks(message) {
        // Nothing to see here atm
    }

    leave(room) {
        for (let u in this.users) {
            let user = this.users[u];
            user.leave(this.id);
        }
        bot.emit('dereg', 'room', this.id);
    }

    startTour(settings) {
        this.tournament = new Tournament.Tournament(this, settings);
    }

    endTour(data) {
        if (this.tournament) this.tournament.end(data);
        if (this.tournament.toString()) {
            this.pasttours.push(this.tournament.toString());
            this.lasttour[0] = Date.now();
            this.lasttour[1] = this.tournament.toString();
        }
        while (this.pasttours.join(', ').length > 250) this.pasttours.shift();
        this.tournament = false;
        this.saveSettings();
    }

    rename(oldname, newname) {
        let id = toId(newname);
        let name = newname.substring(1);
        let rank = newname.charAt(0);
        if (!(id in Users)) {
            Utils.ObjectRename(Users, oldname, id);
            Users[id].rename(newname);
        }
        Utils.ObjectRename(this.users, oldname, id);
        Users[id].rooms[this.id] = rank;
        Users[id].rank = rank;
        if (points.names[id]) points.names[id] = Users[id].name;
    }

    can(user, rank) {
        if (!(toId(user) in Users)) return false;
        return Users[user].can(this.id, rank);
    }
}

Room.prototype.toString = function () {
    return this.id;
}

exports.add = function (id) {
    this[id] = new Room(id);
}