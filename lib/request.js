'use strict'
var stream     = require('stream')
var util       = require('util')
var http       = require('http')
var StringDecoder = require('string_decoder').StringDecoder
var decoder    = new StringDecoder('utf8')
var request    = require('request')
var FeedParser = require('feedparser')
var slenderr   = require('slenderr')

slenderr.define('request config')
slenderr.define('xmlurl not found')

var defalutInterval = 1200
var defalutTimeout  = 5000

function Request (config) {
    if (! config) throw new slenderr.RequestConfigError('config not found')

    stream.Duplex.call(this, {
        decodeStrings: false
      , objectMode: true
    })
    this._writableState.decodeStrings = false
    this._writableState.objectMode = false
    this._readableState.objectMode = true

    var me = this

    setLogger('accesslog', config.access)
    setLogger('errorlog',  config.error)

    this.timeout  = config.timeout  || defalutTimeout
    this.reverse  = new Reverse(config.interval || defalutInterval)

//    this.on('error', function (err) {
//        me.errorlog.write(String(err))
//    })
//    this.on('unpipe', function (src) {
//        src.pipe(me)
//    })

    function setLogger (attribute, val) {
        if ('string' === typeof val) {
            try {
                me[attribute] = require('fs').createWriteStream(val)
            } catch (err) {
                console.log('[%s]', String(err))
            }
            return
        }

        if (val instanceof stream.WritableStream)
            return (me[attribute] = val)

        me[attribute] = ('errorlog' === attribute)
                        ? process.stderr
                        : process.stdout
    }
}

util.inherits(Request, stream.Duplex)

Request.prototype._write = function (_xmlurl, enc, done) {
    if (! _xmlurl) {
//        can not reverse xmlurl
        done(new slenderr.XmlurlNotFoundError)
        callEnd()
        return
    }

    var me = this
    var xmlurl = decoder.write(_xmlurl)
    var req = request.get(xmlurl, {timeout: this.timeout})
    var feedparser = new FeedParser

    req.on('error', onRequestError)
    req.on('response', function (res) {
        var statusCode = res.statusCode
        var loc        = res.request.uri.href
        logAccess(statusCode, loc)

        if (200 !== statusCode)
            return statusCodeError(statusCode, loc)

        res.once('end', onResponseEnd)
        res.pipe(feedparser)
    })

    feedparser.on('error', function (err) {
        onError(err)
        callEnd()
    })
    feedparser.on('readable', function () {
        var entry
        while (null !== (entry = feedparser.read())) {
            me.push(entry)
        }
    })
    feedparser.once('end', callEnd)

    done()

    function onResponseEnd () {
        //me._readableState.ended ||
          me.reverse.write(xmlurl)
        callEnd()
    }
    function onRequestError (err) {
        onError(err)
        onResponseEnd()
    }
    function statusCodeError (statusCode, loc) {
        onRequestError(new Error(util.format(
          '%s [%s] location %s'
          , http.STATUS_CODES[statusCode], statusCode, loc)))
    }
    function onError (err) {
        var error = new Error(util.format(
          '%s xmlurl %s', err.message, xmlurl))
        me.errorlog.write(String(error) + '\n')
    }
    function logAccess (statusCode, loc) {
        me.accesslog.write(util.format(
            '%s [%s] location %s xmlurl %s\n'
          , http.STATUS_CODES[statusCode], statusCode, loc, xmlurl))
    }

    function callEnd () {
        if (me._writableState.finished) {
          me.push(null)
        }
    }
}
Request.prototype._read = function () {}

module.exports = Request

function Reverse (interval) {
    stream.Transform.call(this, {decodeStrings: false})
    this._writableState.decodeStrings = false
    this._readableState.decodeStrings = false
    this.interval = interval
}
util.inherits(Reverse, stream.Transform)
Reverse.prototype._transform = function (xmlurl, enc, done) {
    var me = this
    setTimeout(function () { me.push(xmlurl) }, this.interval)
    done()
}
