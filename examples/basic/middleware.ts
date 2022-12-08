import { NextResponse } from 'next/server'

import { handlePaths } from '../..'


export default handlePaths([
  {
    matcher: '/test/:lang/:path*',
    guard: params => params.lang === 'en',
    handler: async req => {
      console.log("URL PARAMS", req.params) // <= params are injected by `handlePaths`

      // render index page 
      return NextResponse.rewrite(new URL('/', req.url))
    }
  }])
