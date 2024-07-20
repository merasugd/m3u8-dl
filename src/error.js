module.exports = class extends Error {
    constructor(msg) {
        super(msg)
        
        this.name = 'M3U8Error'
        this.message = msg
    }
}