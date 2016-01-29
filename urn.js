#!/usr/bin/env node

//
// TODO use abstractions, async, optimist
//
var path = require('path')
var fs = require('fs')
var assert = require('assert')
var exec = require('child_process').exec
var semver = require('semver')
var mkdirp = require('mkdirp')
// it retains sync versions of everything, thankfully
var shell = require('shelljs')
var identity = function(i) { return i }

var argv = process.argv
var CACHE; // location of npm cache. TODO get via npm config get cache

// TODO add real debug lines
log = function(){
    console.log.apply(console.log, arguments)
}
function readdir_sync_no_ds_store (dir) {
    return fs.readdirSync(dir).filter(function(f) {
        if (f === '.DS_Store') return false
        return true
    })
};

if (argv.indexOf('-h') + argv.indexOf('--help') > -1) {
    console.log('Usage:\n  urn install underscore'
    + '\n  urn i underscore\n  urn underscore'
    + '\n  urn underscore -s # save underscore as dependency in package.json'
    + '\n  urn underscore -S # same as above')
    return
}

var savetojson = false
if (argv.indexOf('-s') > -1) {
    argv[argv.indexOf('-s')] = ''
    savetojson = true;
}
if (argv.indexOf('-S') > -1) {
    argv[argv.indexOf('-S')] = ''
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

    // TODO: add a dry run flag?
    // TODO: add a symlink mode (instead of copying over stuff)
    // copyOver(copyoperations)
    symlinkOver(copyoperations)
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
                console.log('WIN - ' + dest)
            })
        })
    })
}
// a symlink based "installer". does not build anything.
// list all the symlinks this made so you can delete them
//      "find" ~/.npm -maxdepth 5 -type l
//      # and to clean it up:
//      # "find" ~/.npm -maxdepth 5 -type l | xargs "rm"
//      # "find" ~/.npm -maxdepth 5 -type d | grep node_modules | xargs rmdir
// this essentially turns the npm cache into globally installed packages.
// kinda bad.
function symlinkOver (ops) {
    ops.forEach(function(op) {
        var source = op.source
        var dest = path.join(process.cwd(), op.dest)
        // var dest_dirname = path.dirname(dest)
        // mkdirp.sync(dest_dirname) // usually just node_modules
        // log('ln -s ' + source + '/' + ' ' + dest)
        // try {
        //     fs.symlinkSync(source, dest)
        // } catch (err) {
        //     // file may already exist.
        //     // TODO solution: re-do the symlink, b/c versions may have changed.
        //     var eexistsymlink = 'EEXIST: file already exists, symlink'
        //     if (err.message.indexOf(eexistsymlink) === -1) throw err
        // }
        console.log('WIN - ' + dest.replace(process.cwd(), ''))
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
        var inSearchOf = version
        var range = semver.validRange(version)
        var version = semver.maxSatisfying(allversions, range)
        if (!version) {
            throw new Error('no satisfactory version for '
                + name + '@' + inSearchOf
                + '. \n(saw \n  ' + allversions.join('\n  ') + ')')
        }
    // get latest
    } else {
        var latest = allversions.sort(semver.compare).reverse()[0]
        version = latest;
    }

    var folderstocopy = []
    var root = path.join(CACHE, name, version)
    var rootpkg = path.join(CACHE, name, version, 'package')
    var folder_to_copy_contents = readdir_sync_no_ds_store(rootpkg)
    log('foldertocopy', rootpkg)
    log('folder_to_copy_contents', folder_to_copy_contents.join(', '))
    // this is a new-style npm package, the rootpkg contains only package.json
    // here we unzip the archive npm puts here, making this cache folder look
    // the same as how old versions of npm did it.
    // TODO: sometimes an archive will not unzip via command line; but unzips
    // fine via OSX. e.g. minimist@0.0.10, debug@2.0.0, node-sass@0.9.3
    if (folder_to_copy_contents.length === 1) {
        var tarball = path.join(CACHE, name, version, 'package.tgz')
        var untar_command = 'tar -xf ' + tarball + ' -C ' + root
        log('\t> ' + untar_command)
        var stdout = shell.exec(untar_command).output
        log('\tdone untar-ing')

        // for some reason ejs's tgz has a root directory not named "package"
        // this fixes it.
        // TODO could always do this so no need to special case it. but whatevs.
        if (name == 'ejs' && readdir_sync_no_ds_store(rootpkg).length === 1) {
            // very tricky differences. read very carefully.
            var untar_command = 'tar -xf ' + tarball + ' -C ' + rootpkg + ' --strip-components 1'
            log('\t> ' + untar_command)
            var stdout = shell.exec(untar_command).output
            log('\tdone untar-ing, 2nd try')
        }
    }
    folderstocopy.push
        ({ source: rootpkg
        , dest: path.join(currentdir, name)
        })

    var packagejson = path.join(rootpkg, 'package.json')
    var pkg = require(packagejson)
    pkg.dependencies = pkg.dependencies || {}

    // add as dep to root package.json
    save_new_dep_to_cwd_package_json(name, version, currentdir)

    // TODO does not detect circular deps well. For now, we check
    // if the parent tree contains a module of the same name
    // I think it is okay that different versions of the same module in the same
    // dep tree will not be installed. Translation: node-sass cannot contain
    // a different version of node-sass inside it's node_modules, at any depth.
    Object.keys(pkg.dependencies).forEach(function (dep_name) {
        var ver = pkg.dependencies[dep_name]
        if (ver) dep = dep_name + '@' + ver
        if (currentdir.indexOf(dep_name) > -1) {
            // warn, and don't install this circular dep.
            return console.log('CIRCULAR DEP!', name, 'depends on'
                , dep_name, ', but', dep_name
                , 'was depended on earlier (higher up in the dep tree)')
        }
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
    cwdpkg.dependencies = cwdpkg.dependencies || {}
    cwdpkg.dependencies[name] = version.toString()
    log(cwdjson, JSON.stringify(cwdpkg, null, 2))
    fs.writeFileSync(cwdjson, JSON.stringify(cwdpkg, null, 2))
}
