import { NextRequest, NextResponse } from 'next/server'
import { test, expect } from 'vitest'

import { type Middleware } from '../src/types'
import { addParams, findMiddleware, getParams } from '../src/utils'


const queryForDomain = { domain: 'app.acme.org', path: '/' }

const queryForPath = { domain: '', path: '/dashboard/it' }
const middlewares: Middleware[] = [
  {
    matcher: '/dashboard/:lang',
    guard: (params) => params.lang === 'en',
    handler: (_r) => NextResponse.next()
  },
  {
    matcher: '/dashboard/:lang/:path*',
    guard: (params) => params.lang === 'it',
    handler: (_r) => NextResponse.next()
  },
  {
    domain: d => d.startsWith('app'),
    handler: () => NextResponse.next(),
  }
]


test('should find the middleware', () => {
  const middleware = findMiddleware(middlewares, queryForPath)

  expect(middleware).not.toBeUndefined()
  expect(middleware).toHaveProperty('matcher')

  if (!middleware?.matcher) return

  expect(middleware.guard?.({ lang: 'it' })).toBe(true)


  const m2 = findMiddleware(middlewares, queryForDomain)

  expect(m2).not.toBeUndefined()
  expect(m2).not.toHaveProperty('matcher')
  expect(m2).toHaveProperty('domain')
})

test('should retrive the params', () => {
  const middleware = findMiddleware(middlewares, queryForPath)

  expect(middleware).not.toBeUndefined()
  expect(middleware).toHaveProperty('matcher')

  if (!middleware?.matcher) return

  const params = getParams(middleware.matcher, '/dashboard/it')

  expect(params).toHaveProperty('lang')
  expect(params.lang).toBe('it')
})

test('should add the params', () => {
  const middleware = findMiddleware(middlewares, queryForPath)

  expect(middleware).not.toBeUndefined()
  expect(middleware).toHaveProperty('matcher')

  if (!middleware?.matcher) return

  const request = new NextRequest(new URL('http://localhost:3000'))
  const requestWithParams = addParams(request, middleware.matcher, '/dashboard/it')

  expect(requestWithParams).toHaveProperty('params')
  expect(requestWithParams.params).toHaveProperty('lang')
  expect(requestWithParams.params).not.toHaveProperty('path')
  expect(requestWithParams.params.lang).toBe('it')
})
