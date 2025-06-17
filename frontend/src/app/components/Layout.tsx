'use client';

import { Box } from '@chakra-ui/react';
import { Navbar } from './Navbar';
import { NetworkBackground } from './NetworkBackground';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <NetworkBackground />
      <Navbar />
      <Box
        as="main"
        flex="1"
        display="flex"
        flexDirection="column"
        mt="64px"
      >
        {/* Container for max-width content */}
        <Box
          px={{ base: 2, md: 4, lg: 6 }}
        mx="auto"
          w="100%"
          maxW="1600px"
      >
        {children}
        </Box>
      </Box>
    </Box>
  );
}; 