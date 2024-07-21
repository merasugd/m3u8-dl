const fs = require('fs');
const fsp = require('fs/promises');
const axios = require('axios');
const request = require('request');

const error = require('./error');

function dl(uri, out, retries = 3, backoff = 1000) {
    return new Promise(async (resolve) => {
        try {
            if(fs.existsSync(out)) await fsp.rm(out, { recursive: true, force: true });

            let response = await axios({
                method: 'GET',
                url: uri,
                responseType: 'stream',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
                }
            });

            if (!response.data) return resolve(await secondDl(uri, out, retries, backoff));

            let outStr = fs.createWriteStream(out);

            response.data.pipe(outStr);

            outStr.on('finish', async () => resolve(100));
            response.data.on('error', async () => resolve(await secondDl(uri, out, retries, backoff)));
        } catch (e) {
            if (retries > 0) {
                await new Promise(res => setTimeout(res, backoff));
                return resolve(await dl(uri, out, retries - 1, backoff * 2));
            }
            resolve(await secondDl(uri, out, retries, backoff));
        }
    });
}

function secondDl(uri, out, retries = 3, backoff = 1000) {
    return new Promise(async (resolve) => {
        if(fs.existsSync(out)) await fsp.rm(out, { recursive: true, force: true });

        let stream = fs.createWriteStream(out);

        request(uri, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
        })
        .pipe(stream);

        stream.on('error', async (err) => {
            if (retries > 0) {
                await new Promise(res => setTimeout(res, backoff));
                return resolve(await secondDl(uri, out, retries - 1, backoff * 2));
            }
            resolve(new error(err));
        });
        stream.on('finish', () => resolve(100));
    });
}

module.exports = dl;
module.exports.basicDL = dl;
