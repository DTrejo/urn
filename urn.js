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

var argv = process.argv
var CACHE; // location of npm cache. TODO get via npm config get cache

// TODO add real debug lines
log = function(){
    // console.log.apply(console.log, arguments)
}

if (argv.indexOf('-h') + argv.indexOf('--help') > -1) {
    console.log('Usage:\n  urn install underscore'
    + '\n  urn i underscore\n  urn underscore'
    + '\n  urn underscore -s # save underscore as dependency in package.json')
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

if (!argv.length) exec('ls node_modules', function(er, data) {
    if (er) throw er
    console.log('node_modules/\n  '+data.trim().split('\n').join('\n  '))
})

exec('npm config get cache', function(er, cache) {
    if (er) throw err
    CACHE = cache.trim()
    log('found npm cache: ' + CACHE)

    var module_folders =
    fs.readdirSync(CACHE)
    .filter(function(filename) {
        return path.extname(filename) !== '.lock'
        && filename !== '-'
    })
    log(module_folders.slice(0,10))

    var copyoperations = []
    argv.forEach(function(name) {
        copyoperations = copyoperations.concat(rawname2deps(name))
    })
    log('copyoperations', copyoperations)


    copyOver(copyoperations)
})


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
    try { var allversions = fs.readdirSync(allversionsdir) }
    catch(e) { throw new Error('FAIL - module not found: ' + name)}

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
