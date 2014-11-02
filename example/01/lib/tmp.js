var fs     = require('fs')
var path   = require('path')
var mkdirp = require('mkdirp')
var crypto = require('crypto')

function getFilePath (dir, id) {
	return path.join(dir, crypto.createHash('sha1').update(id).digest('hex'))
}
function onFilePath (dir, id, f) {
    var filePath = getFilePath(dir, id)
    mkdirp(path.dirname(filePath), function (err) {
        f(err, filePath)
    })
}

function Store (tmpDir) {
    if (! tmpDir || 'string' !== typeof tmpDir)
        throw new Error('tmpDir not found')
    this.tmpDir = tmpDir
}

Store.prototype.get = function (id, f) {
    onFilePath(this.tmpDir, id, function (err, filePath) {
        if (err) return f(err)

        fs.readFile(filePath, {encoding: 'utf8'}, function (err, raw) {
            if ('undefined' === typeof raw)
                return f(null, raw)

            try {
                var unix = Number(raw)
                if (!(unix > 0))
                    throw new TypeError('can not convert to Number - ' + raw)
            } catch (err) {
                return f(err)
            }

            f(null, unix)
        })
    })
}
Store.prototype.put = function (id, unix, f) {
    onFilePath(this.tmpDir, id, function (err, filePath) {
        if (err) return f(err)
        fs.writeFile(filePath, String(unix), function (err) {
			f(err, filePath)
        })
    })
}
Store.prototype.delete = function (id, f) {
    var filePath = getFilePath(this.tmpDir, id)
    fs.unlink(filePath, function (err) {
        f(err, filePath)
    })
}

module.exports = Store
