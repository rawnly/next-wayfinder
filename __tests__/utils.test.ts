import { NextRequest } from "next/server";
import { test, expect } from "vitest";

import { UrlParams } from "@/types";

import { parse, replaceValues } from "../src/utils";

test("should parse next url", () => {
    const request = new NextRequest("http://google.com");
    request.headers.set("host", "google.com");

    const data = parse(request);

    expect(data).toStrictEqual({
        path: "/",
        domain: "google.com",
    });
});

test("should replace values from obj", () => {
    const params: UrlParams = {
        slug: "my-post",
        path: ["edit"],
    };

    const result = replaceValues("/blog/:slug/:path", params);

    expect(result).toStrictEqual("/blog/my-post/edit");
});
