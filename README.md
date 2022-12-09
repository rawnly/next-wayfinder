<p align="center">
  <br/>
  <a aria-label="NPM version" href="https://www.npmjs.com/package/next-wayfinder">
    <img alt="" src="https://badgen.net/npm/v/next-wayfinder">
  </a>
  <a aria-label="Package size" href="https://bundlephobia.com/result?p=next-wayfinder">
    <img alt="" src="https://badgen.net/bundlephobia/minzip/next-wayfinder">
  </a>
  <a aria-label="License" href="https://github.com/rawnly/next-wayfinder/blob/main/LICENSE">
    <img alt="" src="https://badgen.net/npm/license/next-wayfinder">
  </a>
</p>

# Introduction 
`next-wayfinder` is a lightweight (8kb minzipped) and flexible package that makes it easy to apply different Next.js 
middlewares based on the route, without having to use cumbersome and error-prone path checks. 
This allows you to easily manage and maintain your middlewares, and keep your app clean and organized.

## Installation
```sh
  npm install next-wayfinder
```


## Example 
You can find several examples in the `examples` folder.

Below is a basic implementation:
```ts
// middleware.ts

import { handlePaths } from 'next-wayfinder'
import { NextResponse } from 'next/server'

export default handlePaths([
  {
    matcher: '/dashboard/:lang/:path*',
    guard: params => params.lang === 'en',
    handler: async req => {
      console.log(req.params) // <= params are injected by `handlePaths`

      return NextResponse.next()
    }
  }, {
    domain: /^app\./,
    // rewrites all routes on domain app.* to the `pages/app/<path>`
    handler: req => NextResponse.rewrite(new URL('/app${req.nextUrl.pathname}', req.url))
  }
])
```
