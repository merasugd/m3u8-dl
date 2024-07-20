<h1 align="center">Node M3U8 Downloader</h1>

[![NPM version](https://img.shields.io/npm/v/node-m3u8-downloader.svg)](https://www.npmjs.com/package/node-m3u8-downloader)
[![Project license](https://img.shields.io/github/license/merasugd/m3u8-dl.svg)](https://raw.githubusercontent.com/merasugd/m3u8-dl/main/LICENSE)

## About

A module that downloads m3u8 segments/playlists to specified output

## Installation

```bash
npm install node-m3u8-downloader
```
    
## Usage

#### Create an instance
```js
const m3u8 = require('node-m3u8-downloader');

// Initialize the instance with options
const options = {
    streamUrl: 'http://example.com/playlist.m3u8',
    outputFile: '/path/to/output.mp4',
    mergedPath: '/path/to/merged.ts', // default: os.tmpdir()/m3u8dl/merged.ts
    quality: 'highest', // default: highest
    cache: '/path/to/cache', // cache path for temporary files
    concurrency: 10, // number of download threads (default: 20)
    ffmpegPath: '/custom/path/to/ffmpeg', // custom path to ffmpeg
    useFfmpegToMerge: false, // use ffmpeg to merge
    cb: console.log, // callback function
};

const instance = new m3u8(options);
```
#### Options
 - `streamUrl`: The URL of the m3u8 playlist.
 - `outputFile`:  Path where the downloaded output file will be saved.
 - `mergedPath`: Path where merged ts files from segments are stored (default: cache + '/merged.ts').
 - `quality`: Quality of the stream to download (default: highest) (qualities: highest, medium and lowest).
 - `cache`: Path where temporary files are stored.
 - `concurrency`: Number of download threads (default: 10).
 - `ffmpegPath`: Custom path to ffmpeg executable.
 - `useFfmpegToMerge`: Use ffmpeg to merge segments. (default: false)
 - `cb`: Callback function for events.

#### Add a caption
```js
instance.addCaption(urlOrPath, lang)
```
#### Arguments
  - `urlOrPath`: the uri of subtitles files or path
  - `lang`: language of the subtitle (default: english)

#### Start the download
```js
await instance.startDownload()
```

#### Events
```js
instance.on(event, callback)
```
#### All Events
  - `start`: Emitted when the downloader is starting.
  - `parsing`: Emitted when parsing the m3u8 playlist.
  - `segments_download:build`: Emitted when the segment downloader is built.
  - `segments_download:start`: Emitted when the segment downloader starts.
  - `segments_download:progress`: Emitted when a new segment is downloaded.
    - `progressData`: Object with download progress information.
       ```js
       {
           uri: string,
           path: string,
           progress: {
               total: int,
               current: int,
               percentage: int
           }
       }
       ```
  - `segments_download:end`: Emitted when all segments are downloaded.
  - `merging:start`: Emitted when merging of segments starts.
  - `merging:end`: Emitted when merging of segments ends.
  - `conversion:start`: Emitted when conversion to mp4 and caption adding starts.
  - `conversion:end`: Emitted when conversion ends.
  - `end`: Emitted when the m3u8 download is complete.
  
## Features

- Fast download (uses concurrency)
- Master playlist support
- Simple download
- Supports captions to add to video


## Support

For support, make an issue in github.


## 🔗 Links
[![youtube](https://img.shields.io/badge/youtube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@merasu_gd)
[![facebook](https://img.shields.io/badge/facebook-0A66C2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/profile.php?id=61554338001508)
[![githubpage](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=GitHub%20Pages&logoColor=white)](https://merasugd.github.io/m3u8-dl/)

[![stats](https://github-readme-stats-git-masterrstaa-rickstaa.vercel.app/api?username=merasugd&theme=dark)](https://github.com/merasugd)