import { NextRequest } from "next/server";
import { test, expect } from 'vitest'

import { parse } from "../src/utils";

test('should parse next url', () => {
  const request = new NextRequest('http://google.com')
  request.headers.set('host', 'google.com')

  const data = parse(request)

  expect(data).toStrictEqual({
    path: '/',
    domain: 'google.com'
  })
})
