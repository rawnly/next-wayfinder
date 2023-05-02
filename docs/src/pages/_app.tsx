import "tailwindcss/tailwind.css";

import { Analytics } from "@vercel/analytics/react";
import { AppProps } from "next/app";
import { FC } from "react";

const App: FC<AppProps> = ({ Component, pageProps }) => (
  <>
    <Component {...pageProps} />
    <Analytics />
  </>
);

export default App;
