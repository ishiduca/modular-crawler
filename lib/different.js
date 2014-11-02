'use strict'
var stream   = require('stream')
var util     = require('util')
var slenderr = require('slenderr')

slenderr.define('storage not found')
slenderr.define('entry not found')
slenderr.define('link not found', '"entry.link" not found')
slenderr.define('type entry.date error')

function Different (storage) {
    if (! storage)
        throw new slenderr.StorageNotFoundError

    stream.Transform.call(this, {objectMode: true})
    this._writableState.objectMode = true
    this._readableState.objectMode = true

    this.storage = storage
}
util.inherits(Different, stream.Transform)

Different.prototype._transform = function (entry, enc, done) {
    if (! entry)
        return done(new slenderr.EntryNotFoundError)

    var id = entry.link || entry.guid
    if (! id) {
        this.push(entry)
        return done(new slenderr.LinkNotFoundError)
    }
    var unix = Number(entry.date || entry.pubdate || entry.pubDate)
    if (!(unix > 0)) {
        this.push(entry)
        return done(new slenderr.TypeEntryDateError(null, entry))
    }
    entry.unix = unix
    var me = this
    var storage = this.storage

    storage.get(id, function (err, ent) {
        if (err)
            return done(err)
        if (! ent)
            return put() // create
        if (unix > ent.unix)
            return put() // update
        done()
    })

    function put () {
        storage.put(id, unix, function (err) {
            if (err) return done(err)
            me.push(entry)
            done()
        })
    }
}

module.exports = Different
