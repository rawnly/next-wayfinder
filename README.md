# WayFinder
> Apply multiple nextjs middlewares with ease

```sh
  pnpm add next-wayfinder
```


## Usage
```
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
