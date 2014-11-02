var util = require('util')
var ansi = require('ansi-color')

function Puts () {}
Puts.prototype.out = function (out) {
	this.out_ = out
	return this
}
Puts.prototype.color = function (color) {
	this.color_ = color
	return this
}
Puts.prototype.puts = function () {
    var str = util.format.apply(util, arguments)
    return this.out_ ? this.out_(ansi.set(str, this.color_)) : str
}
Puts.prototype.create = function () {
	return new Puts
}

// var u   = require('./lib/util').put // or u = require('./lib/util/put')
// var grn = u.create()
// grn.color('green').out(console.log.bind(console))
// grn.puts('[%s and %s]', 'tomy', 'matt')
// "[tomy and matt]"
module.exports = new Puts
