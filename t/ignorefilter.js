var path = require('path')
var test = require('tape').test
var IgnoreFilter = require('../lib/ignorefilter')
var stream       = require('stream')
var fs           = require('fs')
var OpmlParser   = require('opmlparser')

test('var IgnoreFilter = require("path/to/ignorefilter")', function (t) {
    t.ok(IgnoreFilter.prototype instanceof stream.Transform, 'IgnoreFilter.prototype instanceof stream.Transform')
    t.end()
})

test('rs.pipe(opmlparser).pipe(new IgnoreFilter(ignore)).pipe(output)', function (t) {
    var rs = fs.createReadStream(path.join(__dirname, '../source/export.xml'))
    var parser = new OpmlParser
    var ignoreXmlUrl = 'http://technorati.com/watchlists/rss.html?wid=486137'
    var ignorefilter = new IgnoreFilter([ignoreXmlUrl])
    var stub   = createStub()
    var spy    = []

    rs.on('end', function () { spy.push('rs end') })
    parser.on('finish', function () { spy.push('parser finish') })
    parser.on('end', function () { spy.push('parser end') })
    ignorefilter.on('finish', function () { spy.push('ignorefilter finish') })
    ignorefilter.on('end', function () { spy.push('ignorefilter end') })

    stub.on('finish', function () {
        t.deepEqual(spy, ['rs end', 'parser finish', 'parser end', 'ignorefilter finish', 'ignorefilter end']
          , 'rs end -> parser finish -> parser end -> ignorefilter finish -> ignorefilter end -> stub finish')
        t.ok(stub.spy.length > 0, 'stub.spy.length ' + stub.spy.length)
        var exists = stub.spy.indexOf(function (xmlurl) { return xmlurl === ignoreXmlUrl })
        t.is(exists, -1, 'ignore xmlurl not found in stub.spy')
        t.end()
    })

    rs.pipe(parser)
      .pipe(ignorefilter)
      .pipe(stub)
})

function createStub () {
    var stub = new stream.Writable({decodeStrings: false})
    stub.spy = []
    stub._write = function (xmlurl, enc, done) {
        this.spy.push(xmlurl)
        done()
    }
    return stub
}
