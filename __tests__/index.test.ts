import { NextRequest, NextResponse } from "next/server";
import { test, expect } from "vitest";

import { type Middleware } from "../src/types";
import { addParams, findMiddleware, getParams } from "../src/utils";

const queryForDomain = { domain: "app.acme.org", path: "/" };

const queryForPath = { domain: "", path: "/dashboard/it" };
const middlewares: Middleware<unknown>[] = [
    {
        path: "/dashboard/:lang",
        filter: params => params.lang === "en",
        handler: _r => NextResponse.next(),
    },
    {
        path: "/dashboard/:lang/:path*",
        filter: params => params.lang === "it",
        handler: _r => NextResponse.next(),
    },
    {
        hostname: d => d.startsWith("app"),
        handler: () => NextResponse.next(),
    },
    {
        path: "/:path*",
        handler: () => NextResponse.next(),
    },
    {
        path: "/events/:slug/edit",
        redirectTo: "/dashboard/events/:slug",
        includeOrigin: "origin",
    },
    {
        path: "/events/:slug/edit",
        redirectTo: "/dashboard/events/:slug",
        includeOrigin: true,
    },
];

test("should find the first", () => {
    const m = findMiddleware(middlewares, {
        hostname: "",
        path: "/dashboard/it",
    });

    expect(m).toBeDefined();
});

test("should use the fallback middleware", () => {
    const middleware = findMiddleware(middlewares, {
        ...queryForPath,
        path: "/abc",
    });

    expect(middleware).toBeDefined();
    expect(middleware?.path).toEqual("/:path*");
});

test("should find the middleware with array", () => {
    const middleware = findMiddleware(
        [
            {
                path: ["/login"],
                handler: () => null,
            },
        ],
        { ...queryForPath, path: "/login" }
    );

    expect(middleware).toBeTruthy();
});

test("should find the middleware with string", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("matcher");

    if (!middleware?.path) return;

    expect(middleware.filter?.({ lang: "it" })).toBe(true);

    const m2 = findMiddleware(middlewares, queryForDomain);

    expect(m2).not.toBeUndefined();
    expect(m2).not.toHaveProperty("matcher");
    expect(m2).toHaveProperty("domain");
});

test("should retrive the params", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("matcher");

    if (!middleware?.path) return;

    const params = getParams(middleware.path, "/dashboard/it");

    expect(params).toHaveProperty("lang");
    expect(params.lang).toBe("it");
});

test("should add the params", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("matcher");

    if (!middleware?.path) return;

    const request = new NextRequest(new URL("http://localhost:3000"));
    const requestWithParams = addParams(
        request,
        middleware.path,
        "/dashboard/it"
    );

    expect(requestWithParams).toHaveProperty("params");
    expect(requestWithParams.params).toHaveProperty("lang");
    expect(requestWithParams.params).not.toHaveProperty("path");
    expect(requestWithParams.params.lang).toBe("it");
});
