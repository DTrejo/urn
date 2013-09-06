//
// TODO use abstractions, async, optimist
//
var path = require('path')
var fs = require('fs')
var assert = require('assert')
var exec = require('child_process').exec
var semver = require('semver')
var mkdirp = require('mkdirp')
var identity = function(i) { return i};

var CACHE_LS = path.join(__dirname, 'cachels.txt')
var argv = process.argv

var CACHE; // location of npm cache. TODO get via npm config get cache

// TODO add real debug lines
log = function(){
    // console.log.apply(console.log, arguments)
}

if (argv.indexOf('-h') + argv.indexOf('--help') > -1) {
    console.log('Usage:\n  nak install underscore'
    + '\n  nak i underscore\n  nak underscore'
    + '\n  nak underscore -s # save underscore as dependency in package.json')
    return
}

var savetojson = false
if (argv.indexOf('-s') > -1) {
    argv[argv.indexOf('-s')] = ''
    savetojson = true;
}

// toss out args; we only know how to `install`
log(argv)
argv[0] = argv[1] = ''
argv[argv.indexOf('i') || 0] = ''
argv[argv.indexOf('install') || 0] = ''
argv = argv.filter(identity)
log(argv)

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

log(module_folders.slice(0,10))

// TODO fragile
var raw = module_folders[2];
if (raw[0] == '~') raw = process.env.HOME + raw.substring(1)
assert(raw[0] === '/', '`npm config get cache` cant be a relative path')
var CACHE = path.dirname(raw)
log('found npm cache: ' + CACHE)

var copyoperations = []
argv.forEach(function(name) {
    copyoperations = copyoperations.concat(rawname2deps(name))
})

log('copyoperations', copyoperations)

copyOver(copyoperations);

// a copy-based "installer". does not build anything. lol.
function copyOver (ops) {
    ops.forEach(function(op) {
        var source = op.source
        var dest = op.dest
        log('cp -R ' + source + '/' + ' ' + dest)
        mkdirp(dest, function(er) {
            if (er) throw er
            exec('cp -R ' + source + '/' + ' ' + dest, function(er) {
                if (er) throw er
                console.log('WIN - ' + dest.replace(process.cwd, ''))
            })
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
    log('inspecting', allversionsdir)

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

    // add as dep to root package.json
    save_new_dep_to_cwd_package_json(name, version, currentdir)

    Object.keys(pkg.dependencies).forEach(function (dep) {
        var ver = pkg.dependencies[dep]
        if (ver) dep = dep + '@' + ver
        log('recur on', dep)
        folderstocopy = folderstocopy.concat(
            rawname2deps(dep, path.join(currentdir, name, 'node_modules'))
        )
    })

    return folderstocopy
}

function save_new_dep_to_cwd_package_json(name, version, currentdir) {
    if (!savetojson) return
    if (currentdir !== 'node_modules') return

    var cwdjson = path.join(process.cwd(), './package.json')
    try {
        var cwdpkg = require(cwdjson)
    } catch (e) {
        return console.error('invalid ' + cwdjson)
    }
    cwdpkg.dependencies[name] = version.toString()
    log(cwdjson, JSON.stringify(cwdpkg, null, 2))
    fs.writeFileSync(cwdjson, JSON.stringify(cwdpkg, null, 2))
}
