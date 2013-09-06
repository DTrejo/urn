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
