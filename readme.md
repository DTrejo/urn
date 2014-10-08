note: consider using `npm install --no-registry` or `npm install -N` instead of
this module. npm will get all the details right (e.g. binary building,
preinstall scripts, etc). As long as you are using a version after v0.10.19, it
will be very fast :) [issue link][1]
[1]:https://github.com/isaacs/npm/issues/1738#issuecomment-26885594

another note: last time I tried (oct 8, 2014), my advice in the previous note
was not working. Thus there is still some value to installing urn. However, I
have not updated it to support the newest npm, that use tarballs instead of
keeping the files in folders in the npm cache. This means that recently
installed packages will NOT install via urn. Urn's code is simple enough that I
should be able to add support relatively easily, once I have the time.

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
```

#### Warning
- Binary packages will not be built.
- No good way to download the whole npm repo, other than `npm install hoarders`
