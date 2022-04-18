import { AppProps } from "next/app";
import { MantineProvider } from "@mantine/core";
import NextNProgress from "nextjs-progressbar";

import "../styles.css";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <MantineProvider withNormalizeCSS withGlobalStyles>
      <NextNProgress options={{ showSpinner: false }} />
      <Component {...pageProps} />
    </MantineProvider>
  );
};

export default App;
