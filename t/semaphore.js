var path = require('path')
var test = require('tape').test
var stream = require('stream')
var StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')
var Semaphore = require('../lib/semaphore')

test('var Semaphore = require("path/to/semaphore")', function (t) {
    t.ok(Semaphore.prototype instanceof stream.Duplex
      , 'Semaphore.prototype instanceof stream.Duplex')
    t.end()
})

test('var semaphore = new Semaphore(over_1_Int)', function (t) {
    t.throws(function () { new Semaphore(-1) },  /locknum must be "Int"/
      , 'new Semaphore(-1) throw TypeError')
    t.end()
})

test('', function (t) {
    var xmlurls = [
        'http://abc.org/001'
      , 'http://def.org/001'
      , 'http://abc.org/002'
      , 'http://abc.org/003'
      , 'http://def.org/002'
      , 'http://abc.org/004'
      , 'http://ghi.org/001'
      , 'http://jkl.org/001'
      , 'http://jkl.org/002'
    ]
    var rs = createReadable(xmlurls)
    var ws = createWritable()
    var semaphore = new Semaphore(3)
    var reverse = createReverse()
    var spy = []

    setTimeout(function () {
        t.deepEqual(ws.spy, [
            'http://abc.org/001'
          , 'http://def.org/001'
          , 'http://ghi.org/001'
        ], 'after 10ms: abc/001, def/001, ghi/001')
    }, 10)
    setTimeout(function () {
        t.deepEqual(ws.spy, [
            'http://abc.org/001'
          , 'http://def.org/001'
          , 'http://ghi.org/001'
          , 'http://abc.org/002'
          , 'http://def.org/002'
          , 'http://jkl.org/001'
        ], 'after 110ms: abc/002, def/002, jkl/001')
    }, 110)
    setTimeout(function () {
        t.deepEqual(ws.spy, [
            'http://abc.org/001'
          , 'http://def.org/001'
          , 'http://ghi.org/001'
          , 'http://abc.org/002'
          , 'http://def.org/002'
          , 'http://jkl.org/001'
          , 'http://abc.org/003'
          , 'http://jkl.org/002'
        ], 'after 220ms: abc/003, jkl/002')
    }, 220)
    setTimeout(function () {
        t.deepEqual(ws.spy, [
            'http://abc.org/001'
          , 'http://def.org/001'
          , 'http://ghi.org/001'
          , 'http://abc.org/002'
          , 'http://def.org/002'
          , 'http://jkl.org/001'
          , 'http://abc.org/003'
          , 'http://jkl.org/002'
          , 'http://abc.org/004'
        ], 'after 330ms: abc/004')
        t.deepEqual(spy
          , [ 'rs end', 'semaphore finish', 'semaphore end'
            , 'ws finish', 'reverse finish', 'reverse end'
            , 'semaphore.unlock finish', 'semaphore.unlock end']
          , 'rs end -> semaphore finish -> semaphore end -> ws finish -> reverse finish -> reverse end -> semaphore.unlock finish -> semaphore.unlock end'
        )
        t.end()
    }, 330)

    rs.on('end', function () { spy.push('rs end') })
    semaphore.on('finish', function () { spy.push('semaphore finish') })
    semaphore.on('end', function () { spy.push('semaphore end') })
    reverse.on('finish', function () { spy.push('reverse finish') })
    reverse.on('end', function () { spy.push('reverse end') })
    semaphore.unlock.on('finish', function () { spy.push('semaphore.unlock finish') })
    semaphore.unlock.on('end', function () { spy.push('semaphore.unlock end') })
    ws.on('finish', function () { spy.push('ws finish') })

    rs.pipe(semaphore).pipe(ws)
    semaphore.pipe(reverse).pipe(semaphore.unlock)

    function createReadable (data) {
        var rs = new stream.Readable({decodeStrings: false})
        rs.data = data.slice(0); rs.data.push(null)
        rs._read = function () {
            this.push(rs.data.shift())
        }
        return rs
    }
    function createWritable () {
        var ws = new stream.Writable({decodeStrings: false})
        ws.spy = []
        ws._write = function (xmlurl, enc, done) {
            this.spy.push(decoder.write(xmlurl))
            done()
        }
        return ws
    }
    function createReverse () {
        var rev = new stream.Transform({decodeStrings: false})
        rev._writableState.decodeStrings = false
        rev._readableState.decodeStrings = false
        rev._transform = function (xmlurl, enc, done) {
            setTimeout(function () {
                this._readableState.ended ||
                this.push(decoder.write(xmlurl))
            }.bind(this), 100)
            done()
        }
        return rev
    }
})
