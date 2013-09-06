# npm for when your internet is down

nak installs npm packages from your npm cache. Unless you've used
`npm cache clean`, you will be able to install ANY package you've ever installed.


## Usage

`nak --help` or `nak -h`

```
Usage:
  nak install underscore
  nak i underscore
  nak underscore
  nak underscore -s # save underscore as dependency in package.json
```

#### Warning
- Binary packages will not be built.
- No good way to download the whole npm repo, other than `npm install hoarders`
