var path   = require('path')
var fs     = require('fs')
var stream = require('stream')
var OmplParser   = require('opmlparser')
var IgnoreFilter = require('../../lib/ignorefilter')
var Semaphore    = require('../../lib/semaphore')
var Request      = require('../../lib/request')
var Different    = require('../../lib/different')
var Tmp          = require('./lib/tmp')
var u            = require('../../lib/util')
var pack         = u.getpack()
var config       = pack.crawler_config

;('access error').split(' ').forEach(function (attr) {
    config.request[attr] = pathNormalize(config.request[attr])
})
config.different.tmp.tmpDir = pathNormalize(config.different.tmp.tmpDir)

var p = {}
;('cyan magenta yellow red').split(' ').forEach(function (color) {
    p[color] = u.put.create().color(color).out(console.log.bind(console))
})

try {
    var rs = fs.createReadStream(pathNormalize(config.export_xml))
    var opmlparser   = new OmplParser
    var ignorefilter = new IgnoreFilter(pathNormalize(config.ignore_txt))
    var semaphore    = new Semaphore(config.lock)
    var request      = new Request(config.request)
    var different    = new Different(new Tmp(config.different.tmp.tmpDir))
    var monitor      = createMonitor()
} catch (err) {
    console.error(err)
    process.exit(1)
}

rs.on('end', p.cyan.puts.bind(p.cyan, '[rs end]'))
opmlparser.on('finish', p.cyan.puts.bind(p.cyan, '[opmlparser finish]'))
opmlparser.on('end', p.cyan.puts.bind(p.cyan, '[opmlparser end]'))
ignorefilter.on('finish', p.cyan.puts.bind(p.cyan, '[ignorefilter finish]'))
ignorefilter.on('end', p.cyan.puts.bind(p.cyan, '[ignorefilter end]'))
semaphore.on('finish', p.cyan.puts.bind(p.cyan, '[semaphore finish]'))
semaphore.on('end', p.cyan.puts.bind(p.cyan, '[semaphore end]'))
semaphore.unlock.on('finish', p.cyan.puts.bind(p.cyan, '[semaphore.unlock finish]'))
semaphore.unlock.on('end', p.cyan.puts.bind(p.cyan, '[semaphore.unlock end]'))
request.on('finish', p.cyan.puts.bind(p.cyan, '[request finish]'))
request.on('end', p.cyan.puts.bind(p.cyan, '[request end]'))
request.reverse.on('finish', p.cyan.puts.bind(p.cyan, '[request.reverse finish]'))
request.reverse.on('end', p.cyan.puts.bind(p.cyan, '[request.reverse end]'))
different.on('finish', p.cyan.puts.bind(p.cyan, '[different finish]'))
different.on('end', p.cyan.puts.bind(p.cyan, '[different end]'))
monitor.on('finish', p.cyan.puts.bind(p.cyan, '[monitor finish]'))


;[ opmlparser, ignorefilter, semaphore, request, different, monitor ]
.forEach(function (stm) {

    stm.on('unpipe', function (src) {
        p.magenta.puts('[%s unpipe %s]', src.constructor.name, stm.constructor.name)
        if (src.ended || src._readableState.ended) return
        src.pipe(stm)
        p.yellow.puts('[%s RePipe %s]', src.constructor.name, stm.constructor.name)
    })

    stm.on('error', function (err) {
        p.red.puts(String(err))
    })
})

rs.pipe(opmlparser)
  .pipe(ignorefilter)
  .pipe(semaphore)
  .pipe(request)
  .pipe(different)
  .pipe(monitor)

request.reverse
  .pipe(semaphore.unlock)



function createMonitor () {
    var monitor = new stream.Writable({
         decodeStrings: false
       , objectMode: true
    })
    monitor._write = function (data, enc, done) {
        console.log(data.title)
        done()
    }
    return monitor
}

function pathNormalize (p) {
    return path.join(pack.dir, p)
}
