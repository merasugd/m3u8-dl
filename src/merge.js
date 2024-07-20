const fs = require('fs')
const path = require('path')
const ffmpeg = require('ffmpeg-static')
const cp = require('child_process')

const error = require('./error')

function ffmpegRun(args, ffmpegPath = ffmpeg) {
    return new Promise(async(resolve) => {

        let proc = cp.spawn(ffmpegPath, args)

        proc.on('error', (err) => {
            return resolve(new error(err))
        })
        proc.on('close', () => resolve(100))
    })
}

module.exports = function(data, mergedPath = null, ffmpegMerge = false, ffmpegPath = ffmpeg) {
    return new Promise(async(resolve) => {
        let cache = data.path
        
        mergedPath = mergedPath || path.join(cache, 'merged.ts')

        let segments = data.segments || []

        if(ffmpegMerge) {
            let to_concat = segments.map(v => {
                if(!v.path) return 'filter-please'

                return `file '${v.path}'\n`
            }).filter(v => v !== 'filter-please')
            let concated_path = path.join(path.dirname(mergedPath), 'joined.txt')

            fs.writeFileSync(concated_path, to_concat.join(''))

            let procMerge = await ffmpegRun([
                '-y',
                '-safe', '0',
                '-f', 'concat',
                '-i', concated_path,
                '-c', 'copy',
                mergedPath
            ], ffmpegPath)

            if(fs.existsSync(concated_path)) fs.rmSync(concated_path, { force: true })
            
            if(procMerge !== 100) return resolve(procMerge)
            
            return resolve(100)
        }

        let out = fs.createWriteStream(mergedPath)
        const ret = new Promise((resolve) => {
            out.on("finish", () => resolve(100))
            out.on("error", (err) => resolve(new error(err)));
        })

        try {
            for (const index of segments) {
                let seg = segments[index] || index
                let file = seg.path
    
                let p = await put(file, out)
                if(p !== 100) return resolve(new error('MERGE FAILED: '+p))
            }
            
            out.end()
            return resolve(await ret)
        } catch (e) {
            return resolve(new error(e))
        }
    })
}

function put(inp, out) {
    return new Promise(async(resolve, reject) => {

        fs.createReadStream(inp)
        .on('error', (err) => {
            return resolve(new error(err))
        })
        .on('end', () => {
            return resolve(100)
        })
        .pipe(out, { end: false})
    })
}