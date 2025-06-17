'use client';

import { Box, Image } from '@chakra-ui/react';
import Link from 'next/link';
import { keyframes } from '@emotion/react';

const glowPulse = keyframes`
  0% { filter: drop-shadow(0 0 2px #3182ce) drop-shadow(0 0 4px #3182ce80); }
  50% { filter: drop-shadow(0 0 6px #319795) drop-shadow(0 0 8px #31979580); }
  100% { filter: drop-shadow(0 0 2px #3182ce) drop-shadow(0 0 4px #3182ce80); }
`;

export const Logo = () => {
  return (
    <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
      <Box
        as="div"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        transition="all 0.3s"
        p={2}
        mx="auto"
        _hover={{
          transform: 'scale(1.05)'
        }}
      >
        <Image
          src="/images/scryntlogo2.png"
          alt="Scrynt Logo"
          height="48px"
          width="auto"
          objectFit="contain"
          sx={{
            filter: 'drop-shadow(0 0 2px #3182ce60)',
            transition: 'all 0.3s'
          }}
          _hover={{
            animation: `${glowPulse} 2s ease-in-out infinite`
          }}
        />
      </Box>
    </Link>
  );
}; 