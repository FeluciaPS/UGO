/**
 * Returns a Date object converted to Eastern Time
 */
let getESTDate = function () {
    let now = Date.now();

    // Subtract 5 hours to convert from UTC to EST
    let est = now - 5 * 60 * 60 * 1000

    return new Date(est);
}

const storage = require('./storage.js');


const pointcap = 75;
const spotlights = {
    1: "Battle Dome",
    2: "Mafia",
    3: "Scavengers",
    4: "Survivor",
    5: "Game Corner",
    8: "Trivia",
    9: "Battle Dome",
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
const maxHP = 100000;

let day = new Date(Date.now()).getDate();

module.exports = {
    room: false,
    load: function () {
        this.names = storage.load('names.json');
        this.points = {}
        this.daypoints = {};
        for (let i of Config.GameRooms) {
            this.points[toId(i)] = storage.load(`${toId(i)}.json`);
            this.daypoints[toId(i)] = storage.load(`${toId(i)}-day.json`);
        }
        this.bosshp = storage.load('bosshp.json').hp
    },
    save: function(room = false) {
        for (let i of Config.GameRooms) {
            if (!room || toId(i) === toId(room)) {
                storage.save(`${toId(i)}.json`, this.points[toId(i)]);
                storage.save(`${toId(i)}-day.json`, this.daypoints[toId(i)]);
            }
        }
        storage.save('bosshp.json', {hp: this.bosshp});
        storage.save('names.json', this.names);
    },
    resetDaily: function() {
        for (let i in this.daypoints) {
            this.daypoints[i] = 0;
        }
        this.save();
    },
    addpoints: function (points, users, room) {
        if (!this.room) return false;
        if (typeof users === "string") users = users.split(',');

        if (this.bosshp === "undefined") this.bosshp = maxHP;

        let now = new Date(Date.now());
        if (now.getDate() != day) {
            this.resetDaily();
            day = now.getDate();
        }
        let spotlight = toId(room) === spotlights[day];
        for (let i in users) {
            let userid = toId(users[i]);
            if (!this.points[userid]) {
                this.points[userid] = {};
                this.daypoints[userid] = {};
            }
            this.points[userid] += points * (spotlight ? 1.5 : 1);
            this.daypoints[userid] += points * (spotlight ? 1.5 : 1);
            if (this.daypoints[userid] > pointcap[room] + (spotlight ? 50 : 0)) {
                let differential = this.daypoints[userid] - pointcap[room] + (spotlight ? 50 : 0);
                this.points[userid] -= differential;
                this.daypoints[userid] -= differential;
            }
        }

        this.save(room);
        return true;
    },
    buildleaderboard: function(room = false) {
        let scores = [];
        for (let i in this.points) {
            scores.push([
                i,
                this.points[i]
            ]);
        }

        scores.sort((a, b) => b[1] - a[1]);
    }
}