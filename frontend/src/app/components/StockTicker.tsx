'use client';

import { Box, HStack, Text, Spinner } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useEffect, useState } from 'react';

const scrollAnimation = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

interface StockData {
  symbol: string;
  price: string;
  change: string;
}

interface StockItemProps {
  symbol: string;
  price: string;
  change: string;
  isGainer: boolean;
}

const StockItem = ({ symbol, price, change, isGainer }: StockItemProps) => {
  const changeColor = isGainer ? 'green.400' : 'red.400';
  const changeValue = isGainer ? `+${change}%` : `${change}%`;
  
  return (
  <HStack
      spacing={2} 
      px={3}
      h="full" 
      alignItems="center"
      borderRight="1px"
      borderColor="whiteAlpha.200"
    minW="fit-content"
  >
      <Text fontWeight="bold" fontSize="sm">{symbol}</Text>
      <Text fontSize="sm">${price}</Text>
      <Text color={changeColor} fontSize="sm" fontWeight="semibold">{changeValue}</Text>
  </HStack>
);
};

export const StockTicker = () => {
  const [gainers, setGainers] = useState<StockData[]>([]);
  const [losers, setLosers] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/stocks');
        if (!response.ok) {
          throw new Error('Failed to load stock data');
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        setGainers(data.gainers || []);
        setLosers(data.losers || []);
      } catch (err) {
        console.error('Error fetching stocks:', err);
        setError('Unable to load stock data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStocks();
  }, []); // Only fetch once when component mounts

  if (isLoading) {
    return (
      <Box w="full" h="80px" display="flex" alignItems="center" justifyContent="center" bg="whiteAlpha.50">
        <Spinner size="lg" color="blue.400" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box w="full" h="80px" display="flex" alignItems="center" justifyContent="center" bg="whiteAlpha.50">
        <Text color="red.400">{error}</Text>
      </Box>
    );
  }

  if (gainers.length === 0 && losers.length === 0) {
    return (
      <Box w="full" h="80px" display="flex" alignItems="center" justifyContent="center" bg="whiteAlpha.50">
        <Text color="gray.400">No stock data available</Text>
      </Box>
    );
  }

  return (
    <Box 
      w="full"
      bg="whiteAlpha.50"
      position="fixed"
      bottom="0"
      left="0"
      right="0"
    >
      {/* Gainers */}
      <Box 
        position="relative" 
        h="40px"
        borderBottom="1px" 
        borderColor="whiteAlpha.200"
        overflow="hidden"
      >
        <Box
          position="absolute"
          display="flex"
          gap={0}
          whiteSpace="nowrap"
          minW="max-content"
          sx={{
            '&:hover': { animationPlayState: 'paused' },
            animation: `${scrollAnimation} 120s linear infinite`,
            willChange: 'transform',
          }}
        >
          <Box display="flex" gap={0}>
            {gainers.map((stock, i) => (
              <StockItem key={`${stock.symbol}-${i}`} {...stock} isGainer={true} />
            ))}
          </Box>
          <Box display="flex" gap={0}>
            {gainers.map((stock, i) => (
              <StockItem key={`${stock.symbol}-repeat-${i}`} {...stock} isGainer={true} />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Losers */}
      <Box 
        position="relative" 
        h="40px"
        overflow="hidden"
      >
        <Box
          position="absolute"
          display="flex"
          gap={0}
          whiteSpace="nowrap"
          minW="max-content"
          sx={{
            '&:hover': { animationPlayState: 'paused' },
            animation: `${scrollAnimation} 120s linear infinite`,
            willChange: 'transform',
          }}
        >
          <Box display="flex" gap={0}>
            {losers.map((stock, i) => (
              <StockItem key={`${stock.symbol}-${i}`} {...stock} isGainer={false} />
            ))}
          </Box>
          <Box display="flex" gap={0}>
            {losers.map((stock, i) => (
              <StockItem key={`${stock.symbol}-repeat-${i}`} {...stock} isGainer={false} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}; 