import { AppProps } from "next/app";
import { MantineProvider } from "@mantine/core";

import "../styles.css";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <MantineProvider>
      <Component {...pageProps} />
    </MantineProvider>
  );
};

export default App;
