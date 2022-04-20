import { AppProps } from "next/app";
import { MantineProvider } from "@mantine/core";
import NextNProgress from "nextjs-progressbar";
import { SessionProvider } from "next-auth/react";

import "../styles.scss";

const App = ({ Component, pageProps: { session, ...pageProps } }: AppProps) => {
  return (
    <MantineProvider withNormalizeCSS withGlobalStyles>
      <NextNProgress options={{ showSpinner: false }} />
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </MantineProvider>
  );
};

export default App;
