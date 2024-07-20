const m3u8 = require('./index')

async function l() {
    let instance = new m3u8({
        streamUrl: 'https://ea.netmagcdn.com:2228/hls-playback/752ad0368988df8b656451ba1cd732cae60a4bd85247be071f5aa74c268f1a03ed9b258251f5e4c5bc5f4d74cdfdd1718a56f574e720483fd2ac307e5449d8bfdeb19c73cfa1267a10296a1d7af56a31ab8f56ebb496e73509b300ceb3e124c1bade0dc9106f2b29afd031bbd98148ffd8b0056b092583e92fabc6372d43df8116acf056826d0965c5e840c02c0b22d9/master.m3u8',
        outputFile: './out.mp4',
        quality: 'highest',
        concurrency: 20,
        useFfmpegToMerge: true,
        cb: console.log
    })

    instance.addCaption('https://s.megastatics.com/subtitle/151dd128b364f474282bced2222fa3a7/eng-2.vtt', 'english')
    instance.addCaption('https://s.megastatics.com/subtitle/151dd128b364f474282bced2222fa3a7/fre-6.vtt', 'french')

    await instance.startDownload()
};l()