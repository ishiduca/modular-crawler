var u = require('../lib/util')
var test = require('tape').test

test('var packageJson = u.getpack()', function (t) {
	var p = u.getpack()
	t.is(p.dir, __dirname, 'p.dir: ' + p.dir)
	t.is(p.name, 'test', 'p.name: ' + p.name)
	t.is(p.version, '0.0.1', 'p.version: ' + p.version)
	t.end()
})
