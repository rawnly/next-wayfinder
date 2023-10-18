# 0.2.3 - 2023-10-18

-   Closed [#6](https://github.com/rawnly/next-wayfinder/issues/6)
-   Added the `options.beforeAll` handler
-   Now the response param is passed as argument to all the middlewares. You can use it instead of creating your own instance of `NextResponse.next()`

> **NOTE**: If you skip the `response` param the result of the `beforeAll` is not applied.
