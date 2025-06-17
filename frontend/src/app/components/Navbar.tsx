'use client';

import {
  Box,
  Flex,
  HStack,
  IconButton,
  useDisclosure,
  Button,
  Stack,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { Logo } from './Logo';
import Link from 'next/link';
import { keyframes } from '@emotion/react';

const textGlow = keyframes`
  0% { text-shadow: 0 0 4px rgba(255, 255, 255, 0.4); }
  50% { text-shadow: 0 0 12px rgba(255, 255, 255, 0.7); }
  100% { text-shadow: 0 0 4px rgba(255, 255, 255, 0.4); }
`;

interface NavLinkProps {
  children: React.ReactNode;
  href: string;
}

const NavLink = ({ children, href }: NavLinkProps) => (
  <Box
    as={Link}
    px={3}
    py={2}
    rounded="xl"
    href={href}
    fontSize="md"
    fontWeight="600"
    letterSpacing="0.02em"
    color="gray.100"
    _hover={{
      textDecoration: 'none',
      bg: 'whiteAlpha.200',
      transform: 'translateY(-2px)',
      animation: `${textGlow} 2s ease-in-out infinite`,
      color: 'white'
    }}
    transition="all 0.2s"
  >
    {children}
  </Box>
);

export const Navbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box
      bgGradient="linear(to-b, gray.800, #171923)"
      px={4}
      boxShadow="0 4px 12px rgba(0, 0, 0, 0.2)"
      position="fixed"
      width="full"
      top={0}
      zIndex="sticky"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
    >
      <Flex h={16} alignItems="center" justify="center" position="relative">
        {/* Mobile menu button */}
        <IconButton
          size="md"
          icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
          aria-label="Open Menu"
          display={{ md: 'none' }}
          onClick={isOpen ? onClose : onOpen}
          variant="ghost"
          color="gray.200"
          _hover={{ bg: 'whiteAlpha.200' }}
          position="absolute"
          left={4}
        />

        {/* Desktop Navigation */}
        <Flex
          display={{ base: 'none', md: 'flex' }}
          justify="center"
          align="center"
          width="full"
          maxW="600px"
          gap="8"
        >
          <NavLink href="/dashboard">Screener</NavLink>
          <Box
            _hover={{
              transform: 'translateY(-2px)',
              animation: `${textGlow} 2s ease-in-out infinite`,
            }}
            transition="all 0.2s"
          >
            <Logo />
          </Box>
          <NavLink href="/analytics">Analytics</NavLink>
        </Flex>

        {/* Mobile Menu */}
        {isOpen && (
          <Box
            pb={4}
            display={{ md: 'none' }}
            position="absolute"
            top="100%"
            left={0}
            right={0}
            bgGradient="linear(to-b, gray.800, #171923)"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
          >
            <Stack as="nav" spacing={4} p={4}>
              <NavLink href="/dashboard">Screener</NavLink>
              <NavLink href="/analytics">Analytics</NavLink>
            </Stack>
          </Box>
        )}
      </Flex>
    </Box>
  );
}; 