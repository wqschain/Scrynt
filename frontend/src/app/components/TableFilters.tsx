'use client';

import {
  Box,
  Input,
  HStack,
  Button,
  VStack,
  SimpleGrid,
  FormControl,
  FormLabel,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';
import { StockData } from '../services/stockService';
import { useCallback, useState } from 'react';

interface TableFiltersProps {
  onFilter: (filters: Partial<Record<keyof StockData, string>>) => void;
  onReset: () => void;
  sectors: string[];
}

interface FilterState {
  ticker: string;
  sector: string;
  market_cap: string;
  price: string;
  dividend_yield: string;
  change_1y: string;
}

export const TableFilters = ({ onFilter, onReset, sectors }: TableFiltersProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const [filters, setFilters] = useState<FilterState>({
    ticker: '',
    sector: '',
    market_cap: '',
    price: '',
    dividend_yield: '',
    change_1y: '',
  });

  const handleInputChange = useCallback((field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    const activeFilters: Partial<Record<keyof StockData, string>> = {};
    (Object.entries(filters) as [keyof StockData, string][]).forEach(([key, value]) => {
      if (value) {
        activeFilters[key] = value;
      }
    });
    onFilter(activeFilters);
  }, [filters, onFilter]);

  const handleReset = useCallback(() => {
    setFilters({
      ticker: '',
      sector: '',
      market_cap: '',
      price: '',
      dividend_yield: '',
      change_1y: '',
    });
    onReset();
  }, [onReset]);

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      mb={4}
    >
      <VStack spacing={4} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <FormControl>
            <FormLabel>Symbol</FormLabel>
            <Input
              placeholder="Search by symbol..."
              value={filters.ticker}
              onChange={(e) => handleInputChange('ticker', e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Sector</FormLabel>
            <Select
              placeholder="All Sectors"
              value={filters.sector}
              onChange={(e) => handleInputChange('sector', e.target.value)}
            >
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Market Cap (Min)</FormLabel>
            <Input
              type="number"
              placeholder="Min market cap..."
              value={filters.market_cap}
              onChange={(e) => handleInputChange('market_cap', e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Price (Min)</FormLabel>
            <Input
              type="number"
              placeholder="Min price..."
              value={filters.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Dividend Yield (Min %)</FormLabel>
            <Input
              type="number"
              placeholder="Min dividend yield..."
              value={filters.dividend_yield}
              onChange={(e) => handleInputChange('dividend_yield', e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>1Y Change (Min %)</FormLabel>
            <Input
              type="number"
              placeholder="Min 1Y change..."
              value={filters.change_1y}
              onChange={(e) => handleInputChange('change_1y', e.target.value)}
            />
          </FormControl>
        </SimpleGrid>
        <HStack justify="flex-end" spacing={4}>
          <Button
            colorScheme="blue"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={handleReset}
          >
            Reset Filters
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}; 