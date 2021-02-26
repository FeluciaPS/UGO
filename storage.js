'use strict';

const FS = require('fs');

let ioStatus = {};
const PATH = 'storage';

if (!FS.existsSync(PATH)) FS.mkdirSync(PATH);

module.exports = {
    save: function (filename, data) {
        if (ioStatus[filename]) return setTimeout(this.save, 500, filename, data);
        ioStatus[filename] = true;
        FS.writeFile(`${PATH}/temp-${filename}`, JSON.stringify(data, null, 2), () => {
            FS.rename(`${PATH}/temp-${filename}`, `${PATH}/${filename}`, () => {
                delete ioStatus[filename];
            })
        })
    },
    load: function (filename) {
        if (!FS.existsSync(`${PATH}/${filename}`)) return {};
        return JSON.parse(FS.readFileSync(`${PATH}/${filename}`));
    }
}