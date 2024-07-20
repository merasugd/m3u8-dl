const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const url = require('node:url');

const dl = require('./download');
const error = require('./error');

module.exports = function segment(segments = [], streamUrl, cache = path.join(require('os').tmpdir(), 'm3u8dl'), maxConnections = 20, cb = console.log) {
    return new Promise(async (resolve) => {
        if (fs.existsSync(cache)) await fsp.rm(cache, { recursive: true, force: true });
        fs.mkdirSync(cache);

        cb('start');

        let total = segments.length;
        let current = 0;

        segments = segments.map(v => {
            let uri = v.uri || v.url;

            if (!isUrl(uri)) {
                v.uri = new url.URL(uri, streamUrl).href;
            }

            return v;
        });

        const semaphore = (max) => {
            let active = 0;
            const waiting = [];

            const take = () => new Promise(res => {
                if (active < max) {
                    active++;
                    res();
                } else {
                    waiting.push(res);
                }
            });

            const release = () => {
                if (waiting.length > 0) {
                    waiting.shift()();
                } else {
                    active--;
                }
            };

            return { take, release };
        };

        const sem = semaphore(maxConnections);

        const retryDownloadSegment = async (index, retries = 3) => {
            let seg = segments[index];
            let parsedUrl = url.parse(seg.uri || seg.url, false);
            let pathName = parsedUrl.pathname;
            let extension = path.extname(pathName);
            let segmentPath = path.join(cache, `segment-${index}${extension}`);

            await sem.take();

            try {
                let dl_r = await dl(seg.uri, segmentPath);
                if (dl_r !== 100) {
                    return resolve(dl_r);
                }

                segments[index].path = segmentPath;
                current += 1;

                cb('progress', {
                    uri: seg.uri || seg.url,
                    path: segmentPath,
                    progress: {
                        total: total,
                        current: current,
                        percentage: Math.floor((current / total) * 100),
                    },
                });
            } catch (e) {
                if (retries > 0) {
                    await new Promise(res => setTimeout(res, 1000 * Math.pow(2, 3 - retries))); // Exponential backoff
                    return retryDownloadSegment(index, retries - 1);
                } else {
                    return resolve(e);
                }
            } finally {
                sem.release();
            }
        };

        try {
            await Promise.all(segments.map((_, index) => retryDownloadSegment(index)));

            let returnData = {
                totalSegments: total,
                segments,
                path: cache
            };

            cb('end', returnData);

            return resolve(returnData);
        } catch (e) {
            return resolve(new error(e));
        }
    });
};

function isUrl(input) {
    try {
        new url.URL(input);
        return true;
    } catch (_) {
        return false;
    }
}
