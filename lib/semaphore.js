'use strict'
var stream = require('stream')
var util   = require('util')
var url    = require('url')
var StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')

function Semaphore (locknum) {
    locknum = parseInt(locknum || 1, 10)

    if (!(locknum > 1))
        throw new TypeError('locknum must be "Int" and be greater than "0" ' + locknum)

    stream.Duplex.call(this, {decodeStrings: false})
    this._writableState.decodeStrings = false
    this._readableState.decodeStrings = false

    this.maxSockets = locknum
    this.semaphore  = []
    this.pool       = []
    this.unlock     = new Unlock

    var me = this
    this.unlock.on('data', function (xmlurl) {
        var opt = url.parse(decoder.write(xmlurl))
        var n   = me.semaphore.indexOf(opt.host)
        if (n !== -1) me.semaphore.splice(n, 1)

        me._readableState.ended ||
        push.call(me, opt.host)

        me._writableState.finished &&
            0 === me.pool.length &&
                me.push(null)
    })
}

util.inherits(Semaphore, stream.Duplex)

function push (host) {
    var domainUnLocked = this.semaphore.indexOf(host) === -1
    var socketUnLocked = this.semaphore.length < this.maxSockets

    if (domainUnLocked && socketUnLocked) {
        for (var i = 0, len = this.pool.length; i < len; i++) {
            var xmlurl = this.pool[i]
            var opt    = url.parse(xmlurl)

            if (this.semaphore.indexOf(opt.host) === -1) {
                this.semaphore.push(opt.host)
                var c = this.pool.splice(i, 1)
                this.push(c[0])
                return
            }
        }
    }
}

Semaphore.prototype._write = function (xmlurl, enc, done) {
    xmlurl = decoder.write(xmlurl)
    var opt = url.parse(xmlurl)
    this.pool.push(xmlurl)
    push.call(this, opt.host)
    done()
}
Semaphore.prototype._read = function () {}

function Unlock () {
    stream.Transform.call(this, {decodeStrings: false})
    this._writableState.decodeStrings = false
    this._readableState.decodeStrings = false
}
util.inherits(Unlock, stream.Transform)
Unlock.prototype._transform = function (xmlurl, enc, done) {
    this.push(xmlurl)
    done()
}

module.exports = Semaphore
