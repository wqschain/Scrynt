'use client';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading: 'var(--font-manrope)',
    body: 'var(--font-manrope)',
  },
  styles: {
    global: {
      body: {
        bg: '#0f1117',
        color: 'gray.100',
      },
      'nav a': {
        color: 'white !important',
      },
    },
  },
  components: {
    Table: {
      baseStyle: {
        th: {
          color: 'blue.200',
        },
        td: {
          color: 'white',
        },
      },
    },
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
    Select: {
      baseStyle: {
        field: {
          bg: 'whiteAlpha.200',
          color: 'white',
          _hover: {
            bg: 'whiteAlpha.300',
          },
        },
      },
    },
    Box: {
      variants: {
        panel: {
          bg: 'whiteAlpha.200',
          p: 4,
          borderRadius: 'md',
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'white',
      },
    },
    Text: {
      baseStyle: {
        color: 'gray.100',
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </CacheProvider>
  );
} 