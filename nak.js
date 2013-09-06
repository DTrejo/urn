var path = require('path')
var fs = require('fs')
var assert = require('assert')
var exec = require('child_process').exec
var semver = require('./node_modules/npm/node_modules/semver')
var mkdirp = require('./node_modules/npm/node_modules/mkdirp')
var identity = function(i) { return i};

var CACHE_LS = './cachels.txt'
var argv = process.argv

var CACHE; // location of npm cache. TODO get via npm config get cache

if (argv.indexOf('-h') + argv.indexOf('--help') > -1) {
    console.log('Usage:\n  nak install underscore'
    + '\n  nak i underscore\n  nak underscore')
    return
}

// toss out args; we only know how to `install`
argv[0] = argv[1] = ''
argv[argv.indexOf('i') || 0] = ''
argv[argv.indexOf('install') || 0] = ''
argv = argv.filter(identity)
console.log(argv)

if (!fs.existsSync(CACHE_LS)) {
    var npm = require('npm')
    // TODO look in npm cache for modules
}

var cache = fs.readFileSync(CACHE_LS, 'utf8')
var module_folders = cache
    .split('\n')
    .filter(function(line) {
        return line.substr(-1) === '/'
    })

console.log(module_folders.slice(0,10))

// TODO fragile
var raw = module_folders[2];
if (raw[0] == '~') raw = process.env.HOME + raw.substring(1)
assert(raw[0] === '/', '`npm config get cache` cant be a relative path')
var CACHE = path.dirname(raw)
console.log('found npm cache: ' + CACHE)

var copyoperations = []
argv.forEach(function(name) {
    copyoperations = copyoperations.concat(rawname2deps(name))
})

console.log('copyoperations', copyoperations)

copyOver(copyoperations);

// a copy-based "installer". does not build anything. lol.
function copyOver (ops) {
    ops.forEach(function(op) {
        var source = op.source
        var dest = op.dest
        console.log('cp -R ' + source + '/' + ' ' + dest)
        mkdirp(dest, function(er) {
            if (er) throw er
            exec('cp -R ' + source + '/' + ' ' + dest)
        })
    })
}

function rawname2deps (name, currentdir) {
    if (!currentdir) currentdir = 'node_modules'

    // TODO parse semver
    var version;
    if (name.indexOf('@') > -1) {
        var parts = name.split('@')
        name = name.split('@')[0]
        version = parts[1]
        if (!name) throw new Error('invalid name')
        if (!semver.validRange(version)) throw new Error('invalid version '+ version)
    }

    var allversionsdir = path.join(CACHE, name)
    console.log('inspecting', allversionsdir)
    
    // get valid package folders
    var allversions = fs.readdirSync(allversionsdir)
    
    allversions = allversions.filter(semver.valid)
    if (!allversions.length) {
        throw new Error('could not find package in cache: ' + name)
    }

    // ensure desired version exists
    if (version) {
        var range = semver.validRange(version)
        var version = semver.maxSatisfying(allversions, range)
        if (!version) {
            throw new Error('no satisfactory version for ' + name
                + '. \n(saw \n  ' + allversions.join('\n  ') + ')')
        }
    // get latest
    } else {
        var latest = allversions.sort(semver.compare).reverse()[0]
        version = latest;
    }

    var folderstocopy = []
    var rootpkg = path.join(CACHE, name, version, 'package')
    folderstocopy.push
        ({ source: rootpkg
        , dest: path.join(currentdir, name)
        })

    var packagejson = path.join(rootpkg, 'package.json')
    var pkg = require(packagejson)

    pkg.dependencies = pkg.dependencies || {}
    Object.keys(pkg.dependencies).forEach(function (dep) {
        var ver = pkg.dependencies[dep]
        if (ver) dep = dep + '@' + ver
        console.log('recur on', dep)
        folderstocopy = folderstocopy.concat(
            rawname2deps(dep, path.join(currentdir, name, 'node_modules'))
        )
    })

    return folderstocopy
}
