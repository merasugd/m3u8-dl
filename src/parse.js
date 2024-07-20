const { Parser } = require('m3u8-parser')
const { URL } = require('node:url')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

const dl = require('./download')
const error = require('./error')

module.exports = function hlshandle(streamUrl, quality = 'highest', cache = path.join(require('os').tmpdir(), 'm3u8dl')) {
    return new Promise(async(resolve) => {

        if(fs.existsSync(cache)) await fsp.rm(cache, { recursive: true, force: true })
        fs.mkdirSync(cache)
        
        let mainParser = new Parser()
        let secondParser = new Parser()

        let main = path.join(cache, 'index.m3u8')
        let fetchedPath = path.join(cache, 'fetched.m3u8')

        if(fs.existsSync(main)) await fsp.rm(main, { force: true })
        if(fs.existsSync(fetchedPath)) await fsp.rm(fetchedPath, { force: true })
        
        let dl_r1 = await dl.basicDL(streamUrl, main)
        if(dl_r1 !== 100) return resolve(dl_r1)
        
        mainParser.push(fs.readFileSync(main).toString())
        mainParser.end()

        let mainParsed = mainParser.manifest

        if(mainParsed.segments && mainParsed.segments.length > 0) {
            return resolve(mainParsed.segments.map(v => {
                let uri = v.uri || v.url

                if(isUrl(uri)) return v

                v.uri = new URL(uri, streamUrl).href

                return v
            }))
        } else if(mainParsed.playlists && Array.isArray(mainParsed.playlists) && mainParsed.playlists.length > 0) {
            let withAttributes = mainParsed.playlists.filter(v => v && v.attributes)
            let sorted = withAttributes.sort((a, b) => a.attributes.BANDWIDTH - b.attributes.BANDWIDTH)

            let all_q = ['highest', 'medium', 'lowest']
            let fetched = filter(sorted, quality)
            let msg_fetched = all_q.find(v => v === quality) ? 'BAD SOURCE' : `QUALITY CHOSEN NOT in [${all_q.join(', ')}]`
            if(!fetched) return resolve(new error(`BAD QUALITY [${quality}]: ${msg_fetched}`))

            let uri = new URL(fetched.uri, streamUrl).href

            let dl_r2 = await dl.basicDL(uri, fetchedPath)
            if(dl_r2 !== 100) return resolve(dl_r2)

            secondParser.push(fs.readFileSync(fetchedPath).toString())
            secondParser.end()

            let fetchedParsed = secondParser.manifest

            if(fetchedParsed.segments && fetchedParsed.segments.length > 0) {
                if(fs.existsSync(main)) await fsp.rm(main, { force: true })
                if(fs.existsSync(fetchedPath)) await fsp.rm(fetchedPath, { force: true })
                
                return resolve(fetchedParsed.segments)
            } else if(fetchedParsed.playlists && Array.isArray(fetchedParsed.playlists) && fetchedParsed.playlists.length > 0) {
                return resolve(await hlshandle(uri, quality, cache))
            } else {
                return resolve(new error('BAD STREAM'))
            }
        } else {
            return resolve(new error('NO STREAMS FOUND'))
        }
    })
}

function filter(all, quality) {
    if (quality === 'highest') {
        return all[all.length - 1]
    } else if (quality === 'lowest') {
        return all[0]
    } else if (quality === 'medium') {
        return all[Math.floor(all.length / 2)]
    } else return null
}

function isUrl(input) {
    try {
        new URL(input)
        return true
    } catch (_) {
        return false
    }
}