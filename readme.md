**update**: as of (oct 8, 2014), npm's offline install commands are not working
for me. Urn supports npm's old *and* new cache formats; so have at it and enjoy
your offline-coding time :)

<strike>note: consider using `npm install --no-registry` or `npm install -N` instead of
this module. npm will get all the details right (e.g. binary building,
preinstall scripts, etc). As long as you are using a version after v0.10.19, it
will be very fast :) [issue link][1]
[1]:https://github.com/isaacs/npm/issues/1738#issuecomment-26885594
</strike>

# npm for when your internet is down

urn installs npm packages from your npm cache. Unless you've used
`npm cache clean`, you will be able to install ANY package you've ever installed.

## `npm -g install urn`

**Usage:**

`urn --help` or `urn -h`

```
Usage:
  urn install underscore
  urn i underscore
  urn underscore
  urn underscore -s # save underscore as dependency in package.json
  urn underscore -S # same as above
```

#### Warning
- Binary packages will not be built.
- No good way to download the whole npm repo, other than `npm install hoarders`
  **update**: hoarders has been removed from npm.
