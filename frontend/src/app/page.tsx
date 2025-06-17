'use client';

import { Box, Heading, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { Manrope } from 'next/font/google';
import { StockTicker } from './components/StockTicker';
import RecentNews from './components/RecentNews';

const manropeFont = Manrope({ subsets: ['latin'] });

const gradientFlow = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

export default function Home() {
  return (
    <Box
      flex="1"
      display="flex"
      flexDirection="column"
      minH="calc(100vh - 64px)"
    >
      <Box 
        pt={8} 
        pb={12}
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Box textAlign="center" className={manropeFont.className}>
          <Heading 
            as="h1" 
            size="xl"
            mb={3}
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={3}
            color="gray.100"
          >
            Welcome to{' '}
            <Text
              as="span"
              display="inline-block"
              fontWeight="bold"
              animation={`${gradientFlow} 8s ease infinite`}
              sx={{
                background: 'linear-gradient(90deg, #22d3ee, #0ea5e9, #2563eb, #3b82f6, #60a5fa, #22d3ee)',
                backgroundSize: '400% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                  background: 'none',
                  color: '#22d3ee'
                }
              }}
            >
              Scrynt
            </Text>
          </Heading>
          
          <Text 
            fontSize="lg"
            color="gray.300" 
            maxW="2xl"
            mx="auto"
            px={4}
            lineHeight="tall"
          >
            Scrynt is a powerful stock analysis platform combining a real-time screener, 
            smart analytics, and up-to-date market news all in one place. Dive into trends, 
            uncover insights, and stay ahead of the market.
          </Text>
        </Box>
      </Box>

      <Box flex="1">
        <RecentNews />
      </Box>

      <Box>
        <StockTicker />
      </Box>
    </Box>
  );
}
