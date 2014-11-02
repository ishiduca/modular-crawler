'use strict'
var stream = require('stream')
var util   = require('util')

function IgnoreFilter (ignore) {
    stream.Transform.call(this, {objectMode: true})
    this._writableState.objectMode = true
    this._readableState.objectMode = false
    this._writableState.decodeStrings = true

    if ('string' === typeof ignore) {
        var fs  = require('fs')
        var raw = fs.readFileSync(ignore, 'utf8')
        ignore = raw.split('\n').filter(Boolean)
    }

    if (util.isArray(ignore)) {
        ignore = ignore.reduce(function (hash, xmlurl) {
            hash[xmlurl] = true
            return hash
        }, {})
    }

    this.ignore = ignore || {}
}

util.inherits(IgnoreFilter, stream.Transform)

IgnoreFilter.prototype._transform = function (outline, enc, done) {
    if (outline && outline.xmlurl) {
        if (! this.ignore[outline.xmlurl])
            this.push(outline.xmlurl)
    }
    done()
}

module.exports = IgnoreFilter
