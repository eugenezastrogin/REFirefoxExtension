#  Stryd RE Firefox extension

## Features

This Firefox extension adds Running Efficiency Metrics to Stryd PowerCenter Pages:

![New Graphs](pics/main.png?raw=true)


## Build

Extension is very light in terms of build stack, it only uses TypeScript compiler and a [web-ext](https://github.com/mozilla/web-ext) to prepare production zip file.


## Architecture

[Original extension](https://github.com/divad1978/REChromeExtension) was completly rewritten from jQuery to native MutationObservers and querySelectors.
