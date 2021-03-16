const fs = require("fs").promises;


class CorpusReader {

    static async fileLinesArray(path) {
        const data = await fs.readFile(path, {encoding: "utf8"});
        return data.split("\n");
    }
}


module.exports = CorpusReader;
