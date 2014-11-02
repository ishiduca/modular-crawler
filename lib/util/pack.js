var fs   = require('fs')
var path = require('path')

function getpack () {
	//var dir = process.argv.length > 2 ? process.argv[1] : process.cwd()
	var dir = process.argv[1] || process.cwd()
    return get(dir)

    function get (dir) {
        var packagejson = path.join(dir, 'package.json')
        if (fs.existsSync(packagejson)) {
            var pack = require(packagejson)
            pack.dir = dir
            return pack
        }

        if (-1 === dir.indexOf(process.env.HOME))
            return null

        return get(path.join(dir, '..'))
    }
}

module.exports = getpack
