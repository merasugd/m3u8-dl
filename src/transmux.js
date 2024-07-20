const cp = require('child_process')
const ffmpeg = require('ffmpeg-static')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const url = require('node:url')
const uuid = require('uuid').v4
const codec = import('iso-639-2')

const error = require('./error')
const dl = require('./download')

module.exports = function(input, output, ffmpegPath = ffmpeg, captions = [], cache = path.join(require('os').tmpdir(), 'm3u8dl')) {
    return new Promise(async(resolve) => {
        let ts_to_video = await ffmpegRun([
            '-i', input,
            '-c', 'copy',
            output
        ], ffmpegPath)
        if(ts_to_video !== 100) return resolve(ts_to_video)

        if(fs.existsSync(input)) fs.rmSync(input, { force: true });
        
        if(captions && captions.length > 0) {
            await captionsLoop(output, cache, ffmpegPath, captions, 0);
        }

        if (fs.existsSync(cache)) await fsp.rm(cache, { recursive: true, force: true });

        return resolve(100)
    })
}

function captionsLoop(vid, cache, ffmpegPath, arr = [], i = 0) {
    return new Promise(async(resolve) => {
        let item = arr[i]

        if(!item || i >= arr.length) return resolve(100)

        await addCaptionToVideo(item.uri, vid, item.lang, cache, ffmpegPath)

        return resolve(await captionsLoop(vid, cache, ffmpegPath, arr, i+1))
    })
} 

function ffmpegRun(args, ffmpegPath = ffmpeg) {
    return new Promise(async(resolve) => {

        let proc = cp.spawn(ffmpegPath, args)

        proc.on('error', (err) => {
            return resolve(new error(err))
        })
        proc.on('close', () => resolve(100))

        //proc.stderr.on('data', (d) => console.log(d.toString()))
    })
}

function addCaptionToVideo(caption, video, lang = 'english', cache = path.join(require('os').tmpdir(), 'm3u8dl'), ffmpegPath = ffmpeg) {
    return new Promise(async(resolve) => {
        let captionsPath = path.join(cache, `${lang}.srt`)
        let withoutSub = path.join(cache, `temp-${uuid()}-without-subtitle${path.extname(video)}`)
        let temp = null

        await fsp.writeFile(withoutSub, fs.readFileSync(video))

        if(isUrl(caption)) {
            let parsedUrl = url.parse(caption, false)
            let pathName = parsedUrl.pathname
            let extension = path.extname(pathName)
            let tempCaption = path.join(cache, `${lang}${extension}`)

            temp = tempCaption
            
            let dler = await dl.basicDL(caption, tempCaption)
            if(dler !== 100) return resolve(dler)
        } else if(isPath(caption)) {
            temp = caption
        } else return resolve(new error('BAD CAPTIONS'));

        if(path.extname(caption) === path.extname(captionsPath)) return resolve(await addCaption(caption));

        let convert_to_srt = await ffmpegRun([
            '-i', temp,
            captionsPath
        ], ffmpegPath)
        if(convert_to_srt !== 100) return resolve(convert_to_srt)

        if(temp && fs.existsSync(temp)) fs.rmSync(temp, { force: true });

        function addCaption(cpt) {
            return new Promise(async(resolv) => {
                
                let lang_codec = langCodec(lang.toLowerCase())
                let add_to_video = await ffmpegRun([
                    '-i', withoutSub,
                    '-i', cpt,
                    '-map', '0', '-map', '1',
                    '-c', 'copy',
                    '-c:s', 'mov_text',
                    '-metadata:s:s:1', `title=${capitalizeFirstLetter(lang)}`,
                    '-metadata:s:s:1', `language=${lang_codec}`,
                    '-y',
                    video
                ], ffmpegPath)

                if(add_to_video !== 100) return resolv(add_to_video);
                if(fs.existsSync(withoutSub)) await fsp.rm(withoutSub, { force: true })
                
                return resolv(100)
            })
        }

        return resolve(await addCaption(captionsPath))
    })
}

function isUrl(input) {
    try {
        new URL(input)
        return true
    } catch (_) {
        return false
    }
}

function isPath(input) {
    return path.isAbsolute(input) || input.startsWith('.') || input.startsWith('~')
}

async function langCodec(lang) {
    let allCodecs = (await codec).iso6392
    let fetched = allCodecs.find(v => v.name.toLowerCase() === lang)

    if(!fetched) return 'eng'

    return fetched.iso6392B
}

function capitalizeFirstLetter(str) {
    if (str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}