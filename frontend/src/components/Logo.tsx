'use client';

import { Box, Image } from '@chakra-ui/react';
import Link from 'next/link';
import { keyframes } from '@emotion/react';

const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export const Logo = () => {
  return (
    <Link href="/">
      <Box
        as="div"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        transition="all 0.3s"
        position="relative"
        borderRadius="md"
        p={2}
        _before={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: "md",
          padding: "2px",
          background: "linear-gradient(45deg, #3182ce, #319795, #3182ce)",
          backgroundSize: "200% 200%",
          opacity: 0,
          transition: "all 0.3s",
          animation: `${gradientFlow} 3s ease infinite`,
          WebkitMask: 
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
        _hover={{
          _before: {
            opacity: 1,
          },
          transform: 'scale(1.05)'
        }}
      >
        <Image
          src="/images/scryntlogo2.png"
          alt="Scrynt Logo"
          height="32px"
          width="auto"
          objectFit="contain"
        />
      </Box>
    </Link>
  );
}; 