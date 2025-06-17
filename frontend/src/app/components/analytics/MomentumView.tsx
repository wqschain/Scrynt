'use client';

import { useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
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
  Button,
  HStack,
  Select,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { StockData, fetchAllStocks } from '../../services/stockService';
import { SearchIcon, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MomentumMetrics {
  ticker: string;
  sector: string;
  change_1m: number;
  change_3m: number;
  change_6m: number;
  change_1y: number;
  rsi: number;
  momentum_score: number;
}

interface SectorAnalysis {
  name: string;
  avgMomentum: number;
  avg1m: number;
  avg3m: number;
  avg6m: number;
  avg1y: number;
  avgRsi: number;
  stockCount: number;
}

type SortableStockField = keyof MomentumMetrics;
type SortableSectorField = keyof SectorAnalysis;

export interface MomentumViewRef {
  fetchData: () => Promise<void>;
}

export interface MomentumViewProps {
  autoLoad?: boolean;
}

export const MomentumView = forwardRef<MomentumViewRef, MomentumViewProps>((props, ref) => {
  const { autoLoad } = props;
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [metrics, setMetrics] = useState<MomentumMetrics[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortableStockField>('momentum_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sectorSortField, setSectorSortField] = useState<SortableSectorField>('avgMomentum');
  const [sectorSortDirection, setSectorSortDirection] = useState<'asc' | 'desc'>('desc');
  const toast = useToast();

  const fetchData = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await fetchAllStocks();
      setStocks(response.data);
      
      const calculatedMetrics = calculateMomentumMetrics(response.data);
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

  function calculateMomentumMetrics(stocks: StockData[]): MomentumMetrics[] {
    // Filter out stocks with missing data
    const validStocks = stocks.filter(stock => 
      stock.change_1m !== null &&
      stock.change_6m !== null &&
      stock.change_1y !== null &&
      stock.beta !== null
    );

    // Calculate momentum score weights
    const weights = {
      change_1m: 0.35,  // 35% weight on 1-month change
      change_6m: 0.35,  // 35% weight on 6-month change
      change_1y: 0.2,   // 20% weight on 1-year change
      beta: 0.1,        // 10% weight on beta (stability)
    };

    return validStocks
      .map(stock => {
        // Normalize beta to be between -100 and 100 (closer to 1 is better)
        const normalizedBeta = (1 - Math.abs(stock.beta - 1)) * 100;

        // Calculate weighted momentum score
        const momentum_score = 
          (stock.change_1m * weights.change_1m) +
          (stock.change_6m * weights.change_6m) +
          (stock.change_1y * weights.change_1y) +
          (normalizedBeta * weights.beta);

        return {
          ticker: stock.ticker,
          sector: stock.sector,
          change_1m: stock.change_1m,
          change_3m: stock.change_ytd, // Using YTD as a proxy for 3M
          change_6m: stock.change_6m,
          change_1y: stock.change_1y,
          rsi: stock.beta * 50, // Using beta as a proxy for RSI
          momentum_score,
        };
      })
      .sort((a, b) => b.momentum_score - a.momentum_score);
  }

  const sectorAverages = useMemo(() => {
    if (!metrics.length) return [];

    const sectorMap = new Map<string, { 
      count: number;
      totalMomentum: number;
      total1m: number;
      total3m: number;
      total6m: number;
      total1y: number;
      totalRsi: number;
    }>();

    metrics.forEach(metric => {
      if (!sectorMap.has(metric.sector)) {
        sectorMap.set(metric.sector, { 
          count: 0,
          totalMomentum: 0,
          total1m: 0,
          total3m: 0,
          total6m: 0,
          total1y: 0,
          totalRsi: 0,
        });
      }
      const sectorData = sectorMap.get(metric.sector)!;
      sectorData.count++;
      sectorData.totalMomentum += metric.momentum_score;
      sectorData.total1m += metric.change_1m;
      sectorData.total3m += metric.change_3m;
      sectorData.total6m += metric.change_6m;
      sectorData.total1y += metric.change_1y;
      sectorData.totalRsi += metric.rsi;
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      name: sector,
      avgMomentum: data.totalMomentum / data.count,
      avg1m: data.total1m / data.count,
      avg3m: data.total3m / data.count,
      avg6m: data.total6m / data.count,
      avg1y: data.total1y / data.count,
      avgRsi: data.totalRsi / data.count,
      stockCount: data.count,
    })).sort((a, b) => b.avgMomentum - a.avgMomentum);
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
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

  const sectors = useMemo(() => {
    return ['All', ...new Set(stocks.map(s => s.sector))].sort();
  }, [stocks]);

  useEffect(() => {
    if (autoLoad) {
      fetchData();
    }
  }, [autoLoad]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        if (loading) {
          setLoading(false);
          toast({
            title: 'Analysis taking too long',
            description: 'The operation was cancelled to prevent unresponsiveness. Please try again.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      }, 10000); // 10 second timeout
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, toast]);

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
    const sectorData = sectorAverages;
    return [...sectorData].sort((a, b) => {
      const multiplier = sectorSortDirection === 'asc' ? 1 : -1;
      if (sectorSortField === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      }
      return (a[sectorSortField] - b[sectorSortField]) * multiplier;
    });
  }, [sectorAverages, sectorSortField, sectorSortDirection]);

  useImperativeHandle(ref, () => ({
    fetchData
  }));

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
          <Text color="white" fontSize="lg">Analyzing momentum metrics...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={4} color="white">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg" color="white">Momentum Analysis</Heading>
          {!autoLoad && (
            <Button
              colorScheme="blue"
              onClick={fetchData}
              isLoading={loading}
              loadingText="Loading..."
            >
              Analyze Momentum
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
              <Heading size="md" mb={4} color="white">Momentum Analysis</Heading>
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
                        onClick={() => handleSort('change_1m')}
                        isNumeric
                      >
                        1M {renderSortIcon('change_1m')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('change_3m')}
                        isNumeric
                      >
                        3M {renderSortIcon('change_3m')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('change_6m')}
                        isNumeric
                      >
                        6M {renderSortIcon('change_6m')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('change_1y')}
                        isNumeric
                      >
                        1Y {renderSortIcon('change_1y')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('rsi')}
                        isNumeric
                      >
                        RSI {renderSortIcon('rsi')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('momentum_score')}
                        isNumeric
                      >
                        SCORE {renderSortIcon('momentum_score')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedMetrics.map((metric) => (
                      <Tr key={metric.ticker}>
                        <Td fontWeight="bold" w="90px">{metric.ticker}</Td>
                        <Td color="gray.300" w="120px">{metric.sector}</Td>
                        <Td isNumeric w="70px" color={metric.change_1m >= 0 ? "green.400" : "red.400"}>
                          {metric.change_1m.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={metric.change_3m >= 0 ? "green.400" : "red.400"}>
                          {metric.change_3m.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={metric.change_6m >= 0 ? "green.400" : "red.400"}>
                          {metric.change_6m.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={metric.change_1y >= 0 ? "green.400" : "red.400"}>
                          {metric.change_1y.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={metric.rsi > 50 ? "green.400" : "red.400"}>
                          {metric.rsi.toFixed(0)}
                        </Td>
                        <Td isNumeric w="80px" color={metric.momentum_score >= 0 ? "green.400" : "red.400"}>
                          {metric.momentum_score.toFixed(0)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="whiteAlpha.200" p={4} borderRadius="md" h="full">
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
                        w="160px"
                      >
                        SECTOR {renderSectorSortIcon('name')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('stockCount')}
                        isNumeric
                        w="50px"
                      >
                        # {renderSectorSortIcon('stockCount')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avg1m')}
                        isNumeric
                        w="70px"
                      >
                        1M {renderSectorSortIcon('avg1m')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avg3m')}
                        isNumeric
                        w="70px"
                      >
                        3M {renderSectorSortIcon('avg3m')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avg6m')}
                        isNumeric
                        w="70px"
                      >
                        6M {renderSectorSortIcon('avg6m')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avg1y')}
                        isNumeric
                        w="70px"
                      >
                        1Y {renderSectorSortIcon('avg1y')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgRsi')}
                        isNumeric
                        w="70px"
                      >
                        RSI {renderSectorSortIcon('avgRsi')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgMomentum')}
                        isNumeric
                        w="80px"
                      >
                        SCORE {renderSectorSortIcon('avgMomentum')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedSectorAverages.map((sector) => (
                      <Tr key={sector.name}>
                        <Td fontWeight="bold" w="160px">{sector.name}</Td>
                        <Td isNumeric w="50px" color="gray.300">{sector.stockCount}</Td>
                        <Td isNumeric w="70px" color={sector.avg1m >= 0 ? "green.400" : "red.400"}>
                          {sector.avg1m.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={sector.avg3m >= 0 ? "green.400" : "red.400"}>
                          {sector.avg3m.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={sector.avg6m >= 0 ? "green.400" : "red.400"}>
                          {sector.avg6m.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={sector.avg1y >= 0 ? "green.400" : "red.400"}>
                          {sector.avg1y.toFixed(1)}%
                        </Td>
                        <Td isNumeric w="70px" color={sector.avgRsi > 50 ? "green.400" : "red.400"}>
                          {sector.avgRsi.toFixed(0)}
                        </Td>
                        <Td isNumeric w="80px" color={sector.avgMomentum >= 0 ? "green.400" : "red.400"}>
                          {sector.avgMomentum.toFixed(0)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          </GridItem>
        </Grid>
      </VStack>
      
      <Box mt={8} p={4} bg="whiteAlpha.100" borderRadius="md">
        <VStack align="start" spacing={4}>
          <Heading size="md" color="white">Understanding Momentum Analysis</Heading>
          
          <Text color="gray.300">
            Momentum analysis helps identify stocks with strong price trends and market performance. Here's what each metric means:
          </Text>
          
          <UnorderedList color="gray.300" spacing={2}>
            <ListItem>
              <Text as="span" fontWeight="bold" color="white">Price Momentum (1M, 3M, 6M):</Text>
              {" "}Measures the percentage change in stock price over different time periods. Higher values indicate stronger upward price movement.
            </ListItem>
            
            <ListItem>
              <Text as="span" fontWeight="bold" color="white">Relative Strength Index (RSI):</Text>
              {" "}A momentum indicator that measures the speed and magnitude of recent price changes. Values above 70 suggest overbought conditions, while values below 30 suggest oversold conditions.
            </ListItem>
            
            <ListItem>
              <Text as="span" fontWeight="bold" color="white">Volume Trend:</Text>
              {" "}Analyzes trading volume patterns to confirm price movements. Increasing volume alongside price trends suggests stronger momentum.
            </ListItem>
            
            <ListItem>
              <Text as="span" fontWeight="bold" color="white">Moving Average Convergence/Divergence (MACD):</Text>
              {" "}Shows the relationship between two moving averages of a stock's price. Helps identify trend changes and momentum shifts.
            </ListItem>
          </UnorderedList>
          
          <Text color="gray.300" mt={2}>
            A high momentum score suggests the stock has shown consistent price strength and could continue its current trend. However, always consider other factors like market conditions, company fundamentals, and your investment strategy before making decisions.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}); 