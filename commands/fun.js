module.exports = {
	autohide: {
		'': 'on',
		on: function (room, user, args) {
			if (!user.can(room, '#')) return;
			room.settings.autohide = true;
			room.saveSettings(true);
			room.send('Automatic hidetext for mutes enabled');
		},
		off: function (room, user, args) {
			if (!user.can(room, '#')) return;
			room.settings.autohide = false;
			room.saveSettings(true);
			room.send('Automatic hidetext for mutes disabled');
		},
		toggle: function (room, user, args) {
			if (!user.can(room, '#')) return;
			room.settings.autohide = !room.settings.autohide;
			room.saveSettings(true);
			room.send(`Automatic hidetext  for mutes ${room.settings.autohide ? 'en' : 'dis'}abled`);
		},
	}
}