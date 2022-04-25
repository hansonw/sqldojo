import { AppProps } from "next/app";
import { MantineProvider } from "@mantine/core";
import NextNProgress from "nextjs-progressbar";
import { SessionProvider } from "next-auth/react";

import "../styles.scss";
import Head from "next/head";

const App = ({ Component, pageProps: { session, ...pageProps } }: AppProps) => {
  return (
    <MantineProvider withNormalizeCSS withGlobalStyles>
      <Head>
        <title>SQL Dojo</title>
      </Head>
      <NextNProgress options={{ showSpinner: false }} />
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </MantineProvider>
  );
};

export default App;
