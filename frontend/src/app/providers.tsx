'use client';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'system',
    useSystemColorMode: true,
  },
  styles: {
    global: {
      body: {
        transition: 'background-color 0.2s',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        _hover: {
          transform: 'translateY(-1px)',
          boxShadow: 'sm',
        },
        _active: {
          transform: 'translateY(0)',
        },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </CacheProvider>
  );
} 