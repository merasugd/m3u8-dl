const fs = require('fs')
const path = require('path')
const events = require('node:events')
const ffmpeg = require('ffmpeg-static')

const error = require('./src/error')
const parse = require('./src/parse')
const segments = require('./src/segments')
const merge = require('./src/merge')
const transmux = require('./src/transmux')

class M3U8 extends events {
    /**
    * Create an M3U8 Instance Downloader.
    * @constructor
    * @param {Object} opt - Options for instance
    * @param {String} opt.streamUrl - The URL of the m3u8 playlist.
    * @param {String} opt.outputFile - Path where the downloaded output file will be saved.
    * @param {String} [opt.quality='highest'] - Quality of the stream to download (default: highest) (qualities: highest, medium and lowest)
    * @param {String} [opt.mergedPath='require('os').tempdir()/m3u8dl/merged.ts'] - Path where merged ts files from segments are stored (default: cache + '/merged.ts').
    * @param {String} [opt.cache='require('os').tempdir()/m3u8dl/'] - Path where temporary files are stored.
    * @param {Number} [opt.concurrency=10] - Number of download threads (default: 10)
    * @param {String} [opt.ffmpegPath=ffmpegStatic] - Custom path to ffmpeg executable. (default: ffmpeg-static)
    * @param {Boolean} [opt.useFfmpegToMerge=false] - Use ffmpeg to merge segments.
    * @param {Function} [opt.cb=function(event,data){}] - Callback function for events. (default: function(event, data){})
    */
    constructor(opt) {
        super()

        let { streamUrl, outputFile, quality, mergedPath, cache, concurrency, ffmpegPath, useFfmpegToMerge, cb } = opt
        let options = {
            streamUrl,
            output: outputFile,
            quality: String(quality || 'highest').toLowerCase(),
            mergedPath,
            cache: cache || path.join(require('os').tmpdir(), 'm3u8dl'),
            concurrency: concurrency || 10,
            captions: [],
            ffmpegPath: ffmpegPath || ffmpeg,
            ffmpegMerge: useFfmpegToMerge || false,
            cb: cb || function(){}
        }

        if(!options.streamUrl) throw new error('NO STREAM URL');
        if(!options.output) throw new error('PLEASE PROVIDE AN OUTPUT PATH');

        options.mergedPath = options.mergedPath || path.join(options.cache, 'merged.ts')

        this._options = options
        this.instance = this

        this.oldEmit = this.emit
        this.emit = function(one, ...args) {
            this._options.cb(one, ...args)
            return this.oldEmit(one, ...args)
        }
    }

    /**
    * Add a caption file.
    * @function
    * @param {string} uri - URI or Path of the caption
    * @param {string} lang - Language of the caption
    */
    addCaption(uri = null, lang = 'english') {
        this._options.captions.push({
            uri,
            lang
        })
    }

    /**
    * Starts the download
    * @function
    */
    startDownload() {
        let master = this
        let captions = this._options.captions

        master.emit('start')

        return new Promise(async(resolve) => {
            master.emit('parsing')

            let options = master._options
            let parsedSegments = await parse(options.streamUrl, options.quality, options.cache)

            if(!Array.isArray(parsedSegments)) {
                master.emit('error', parsedSegments)
                return resolve(new error(parsedSegments))
            }

            master.emit('segments_download:build')

            let data = await segments(parsedSegments, options.streamUrl, options.cache, options.concurrency, (event, data) => {
                return master.emit(`segments_download:${event}`, data)
            })
            if(!data || typeof data !== 'object' || !data.totalSegments || !Array.isArray(data.segments)) {
                master.emit('error', data)
                return resolve(new error(data))
            }

            master.emit('merging:start')

            let merged = await merge(data, options.mergedPath, options.ffmpegMerge, options.ffmpegPath)
            if(merged !== 100) {
                master.emit('error', merged)
                return resolve(new error(merged))
            }

            master.emit('merging:end')
            master.emit('conversion:start')

            let to_mp4 = await transmux(options.mergedPath, options.output, options.ffmpegPath, captions, options.cache)
            if(to_mp4 !== 100) {
                master.emit('error', to_mp4)
                return resolve(new error(to_mp4))
            }

            master.emit('conversion:end')
            master.emit('end')

            if(fs.existsSync(options.cache)) await require('fs/promises').rm(options.cache, { recursive: true, force: true })

            return resolve(100)
        })
    }
}

module.exports = M3U8