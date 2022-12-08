import { NextMiddleware, NextFetchEvent, NextRequest } from "next/server";
import { RequireExactlyOne } from 'type-fest'

export type Urlparams = Record<string, string | string[] | undefined>
export interface NextRequestWithParams extends NextRequest {
  params: Urlparams
}

export type NextMiddlewareWithParams = (request: NextRequestWithParams, event: NextFetchEvent) => ReturnType<NextMiddleware>

export type Middleware = RequireExactlyOne<{
  handler: NextMiddlewareWithParams | Middleware[],
  domain?: RegExp | ((domain: string) => boolean);
  matcher?: string,
  guard?: (params: Urlparams) => boolean
}, 'domain' | 'matcher'>


