'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  Box,
  VStack,
  Grid,
  GridItem,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Spinner,
  useToast,
  Select,
  Button,
  HStack,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { StockData, fetchAllStocks } from '../../services/stockService';
import { SearchIcon, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';

interface DividendMetrics {
  ticker: string;
  sector: string;
  dividend_yield: number;
  dividend_growth: number;
  payout_ratio: number;
}

interface SectorAnalysis {
  name: string;
  avgYield: number;
  avgPayout: number;
  avgGrowth: number;
  stockCount: number;
}

type SortableStockField = keyof DividendMetrics;
type SortableSectorField = keyof SectorAnalysis;

export interface DividendViewRef {
  fetchData: () => Promise<void>;
}

export interface DividendViewProps {
  autoLoad?: boolean;
}

export const DividendView = forwardRef<DividendViewRef, DividendViewProps>((props, ref) => {
  const { autoLoad } = props;
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [metrics, setMetrics] = useState<DividendMetrics[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortableStockField>('dividend_yield');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sectorSortField, setSectorSortField] = useState<SortableSectorField>('avgYield');
  const [sectorSortDirection, setSectorSortDirection] = useState<'asc' | 'desc'>('desc');
  const toast = useToast();

  const fetchData = async () => {
    if (loading) return; // Prevent multiple simultaneous fetches
    
    try {
      setLoading(true);
      const response = await fetchAllStocks();
      setStocks(response.data);
      
      // Calculate dividend metrics
      const calculatedMetrics = calculateDividendMetrics(response.data);
      setMetrics(calculatedMetrics);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch stock data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchData
  }));

  useEffect(() => {
    if (autoLoad) {
      fetchData();
    }
  }, [autoLoad]);

  // Update filteredMetrics to include search
  const filteredMetrics = useMemo(() => {
    // Use exact matching for sector filtering
    let filtered = selectedSector === 'All'
      ? metrics
      : metrics.filter(m => m.sector === selectedSector);

    if (searchQuery) {
      filtered = filtered.filter(metric => 
        metric.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [metrics, selectedSector, searchQuery]);

  // Get unique sectors for the dropdown
  const sectors = useMemo(() => {
    return ['All', ...new Set(stocks.map(s => s.sector))].sort();
  }, [stocks]);

  function calculateDividendMetrics(stocks: StockData[]): DividendMetrics[] {
    return stocks
      .filter(stock => stock.dividend_yield > 0)
      .map(stock => ({
        ticker: stock.ticker,
        sector: stock.sector,
        dividend_yield: stock.dividend_yield,
        dividend_growth: stock.dividend_growth,
        payout_ratio: stock.payout_ratio,
      }))
      .sort((a, b) => b.dividend_yield - a.dividend_yield);
  }

  function calculateSectorAverages(stocks: DividendMetrics[]) {
    const sectorMap = new Map<string, { 
      count: number; 
      totalYield: number; 
      totalPayout: number; 
      totalGrowth: number;
    }>();

    stocks.forEach(stock => {
      if (!sectorMap.has(stock.sector)) {
        sectorMap.set(stock.sector, { 
          count: 0, 
          totalYield: 0, 
          totalPayout: 0, 
          totalGrowth: 0 
        });
      }
      const sectorData = sectorMap.get(stock.sector)!;
      sectorData.count++;
      sectorData.totalYield += stock.dividend_yield;
      sectorData.totalPayout += stock.payout_ratio;
      sectorData.totalGrowth += stock.dividend_growth;
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      name: sector,
      avgYield: data.totalYield / data.count,
      avgPayout: data.totalPayout / data.count,
      avgGrowth: data.totalGrowth / data.count,
      stockCount: data.count,
    })).sort((a, b) => b.avgYield - a.avgYield);
  }

  const handleSort = (field: SortableStockField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSectorSort = (field: SortableSectorField) => {
    if (sectorSortField === field) {
      setSectorSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSectorSortField(field);
      setSectorSortDirection('desc');
    }
  };

  const renderSortIcon = (field: SortableStockField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <TriangleUpIcon ml={1} /> : <TriangleDownIcon ml={1} />;
  };

  const renderSectorSortIcon = (field: SortableSectorField) => {
    if (sectorSortField !== field) return null;
    return sectorSortDirection === 'asc' ? <TriangleUpIcon ml={1} /> : <TriangleDownIcon ml={1} />;
  };

  const sortedMetrics = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'ticker' || sortField === 'sector') {
        return a[sortField].localeCompare(b[sortField]) * multiplier;
      }
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [filteredMetrics, sortField, sortDirection]);

  const sortedSectorAverages = useMemo(() => {
    const sectorData = calculateSectorAverages(filteredMetrics);
    return [...sectorData].sort((a, b) => {
      const multiplier = sectorSortDirection === 'asc' ? 1 : -1;
      switch (sectorSortField) {
        case 'name':
          return a.name.localeCompare(b.name) * multiplier;
        case 'avgYield':
          return (a.avgYield - b.avgYield) * multiplier;
        case 'avgPayout':
          return (a.avgPayout - b.avgPayout) * multiplier;
        case 'avgGrowth':
          return (a.avgGrowth - b.avgGrowth) * multiplier;
        case 'stockCount':
          return (a.stockCount - b.stockCount) * multiplier;
        default:
          return 0;
      }
    });
  }, [filteredMetrics, sectorSortField, sectorSortDirection]);

  if (loading) {
    return (
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="blackAlpha.700"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex="modal"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" speed="0.65s" />
          <Text color="white" fontSize="lg">Analyzing dividend metrics...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={4} color="white">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg" color="white">Dividend Analysis</Heading>
          {!autoLoad && (
            <Button
              colorScheme="blue"
              onClick={fetchData}
              isLoading={loading}
              loadingText="Loading..."
            >
              Analyze Dividends
            </Button>
          )}
        </HStack>

        {stocks.length > 0 && (
          <HStack spacing={4}>
            <Select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              maxW="300px"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
            >
              {sectors.map((sector) => (
                <option key={sector} value={sector} style={{color: 'black'}}>
                  {sector}
                </option>
              ))}
            </Select>

            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="whiteAlpha.200"
                _hover={{ bg: "whiteAlpha.300" }}
                _focus={{ bg: "whiteAlpha.400" }}
              />
            </InputGroup>
          </HStack>
        )}

        <Grid templateColumns="repeat(2, 1fr)" gap={6}>
          <GridItem>
            <Box bg="whiteAlpha.200" p={4} borderRadius="md" overflowX="auto">
              <Heading size="md" mb={4} color="white">Dividend Analysis</Heading>
              <TableContainer 
                maxHeight="500px" 
                overflowY="auto"
                sx={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'whiteAlpha.100',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'whiteAlpha.300',
                    borderRadius: '8px',
                  },
                }}
              >
                <Table variant="simple" size="sm">
                  <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                    <Tr>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('ticker')}
                      >
                        TICKER {renderSortIcon('ticker')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('sector')}
                      >
                        SECTOR {renderSortIcon('sector')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('dividend_yield')}
                      >
                        YIELD {renderSortIcon('dividend_yield')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('payout_ratio')}
                      >
                        PAYOUT {renderSortIcon('payout_ratio')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('dividend_growth')}
                      >
                        GROWTH {renderSortIcon('dividend_growth')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedMetrics.map((stock) => (
                      <Tr key={stock.ticker}>
                        <Td color="white" fontWeight="bold">{stock.ticker}</Td>
                        <Td color="white">{stock.sector}</Td>
                        <Td color="green.300">{stock.dividend_yield.toFixed(2)}%</Td>
                        <Td color={stock.payout_ratio <= 75 ? "green.300" : "yellow.300"}>
                          {stock.payout_ratio.toFixed(2)}%
                        </Td>
                        <Td color={stock.dividend_growth >= 0 ? "green.300" : "red.300"}>
                          {stock.dividend_growth.toFixed(2)}%
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="whiteAlpha.200" p={4} borderRadius="md" overflowX="auto">
              <Heading size="md" mb={4} color="white">Sector Analysis</Heading>
              <TableContainer 
                maxHeight="500px" 
                overflowY="auto"
                sx={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'whiteAlpha.100',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'whiteAlpha.300',
                    borderRadius: '8px',
                  },
                }}
              >
                <Table variant="simple" size="sm">
                  <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                    <Tr>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('name')}
                      >
                        SECTOR {renderSectorSortIcon('name')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgYield')}
                      >
                        AVG YIELD {renderSectorSortIcon('avgYield')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgPayout')}
                      >
                        AVG PAYOUT {renderSectorSortIcon('avgPayout')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgGrowth')}
                      >
                        AVG GROWTH {renderSectorSortIcon('avgGrowth')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('stockCount')}
                      >
                        STOCKS {renderSectorSortIcon('stockCount')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedSectorAverages.map((sector) => (
                      <Tr key={sector.name}>
                        <Td color="white" fontWeight="bold">{sector.name}</Td>
                        <Td color="green.300">{sector.avgYield.toFixed(2)}%</Td>
                        <Td color={sector.avgPayout <= 75 ? "green.300" : "yellow.300"}>
                          {sector.avgPayout.toFixed(2)}%
                        </Td>
                        <Td color={sector.avgGrowth >= 0 ? "green.300" : "red.300"}>
                          {sector.avgGrowth.toFixed(2)}%
                        </Td>
                        <Td color="white">{sector.stockCount}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          </GridItem>
        </Grid>

        <Box mt={8} p={4} bg="whiteAlpha.100" borderRadius="md">
          <VStack align="start" spacing={4}>
            <Heading size="md" color="white">Understanding Dividend Analysis</Heading>
            
            <Text color="gray.300">
              Dividend analysis helps evaluate stocks based on their income-generating potential and dividend sustainability. Here's what each metric means:
            </Text>
            
            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Dividend Yield:</Text>
                {" "}The annual dividend payment as a percentage of the stock price. Higher yields offer more income, but extremely high yields might signal unsustainability.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Payout Ratio:</Text>
                {" "}The percentage of earnings paid as dividends. A lower ratio (below 75%) typically indicates more sustainable dividends, while higher ratios might signal risk.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Dividend Growth Rate:</Text>
                {" "}The rate at which the company has increased its dividend payments. Consistent growth suggests financial health and shareholder-friendly policies.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Dividend Coverage Ratio:</Text>
                {" "}How many times the company could pay its dividend from earnings. Higher coverage (above 2x) suggests more secure dividends.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Years of Dividend Growth:</Text>
                {" "}The consecutive years of dividend increases. Longer streaks indicate more reliable dividend payments and company stability.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Free Cash Flow Coverage:</Text>
                {" "}How well the company's free cash flow covers dividend payments. Strong coverage indicates better dividend sustainability.
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              Dividend investing can provide regular income and potential long-term growth through dividend reinvestment. Look for companies with sustainable payout ratios, strong cash flows, and consistent dividend growth history. However, remember that dividends aren't guaranteed and can be reduced or eliminated if a company faces financial difficulties.
            </Text>

            <Text color="gray.300">
              Companies that consistently raise dividends often belong to the "Dividend Aristocrats" (25+ years of increases) or "Dividend Kings" (50+ years) categories, demonstrating exceptional dividend reliability.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}); 