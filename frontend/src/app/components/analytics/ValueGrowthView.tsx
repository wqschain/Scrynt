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
  Select,
  Button,
  HStack,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  UnorderedList,
  ListItem,
  Icon,
} from '@chakra-ui/react';
import { StockData, fetchAllStocks } from '../../services/stockService';
import dynamic from 'next/dynamic';
import { SearchIcon } from '@chakra-ui/icons';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ValueGrowthMetrics {
  ticker: string;
  sector: string;
  pegRatio: number;
  epsGrowth: number;
  peRatio: number;
  pbRatio: number;
  valueScore: number;
  growthScore: number;
}

interface SectorAnalysis {
  name: string;
  avgValue: number;
  avgGrowth: number;
  avgPeg: number;
  stockCount: number;
}

export interface ValueGrowthViewRef {
  fetchData: () => Promise<void>;
}

export interface ValueGrowthViewProps {
  autoLoad?: boolean;
}

export const ValueGrowthView = forwardRef<ValueGrowthViewRef, ValueGrowthViewProps>((props, ref) => {
  const { autoLoad } = props;
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [metrics, setMetrics] = useState<ValueGrowthMetrics[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<keyof ValueGrowthMetrics>('growthScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sectorSortField, setSectorSortField] = useState<keyof SectorAnalysis>('avgGrowth');
  const [sectorSortDirection, setSectorSortDirection] = useState<'asc' | 'desc'>('desc');
  const toast = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchAllStocks();
      setStocks(response.data);
      
      // Calculate value/growth metrics
      const calculatedMetrics = calculateValueGrowthMetrics(response.data);
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

  // Filter metrics based on selected sector
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

  // Get unique sectors for the dropdown
  const sectors = useMemo(() => {
    return ['All', ...new Set(stocks.map(s => s.sector))].sort();
  }, [stocks]);

  // Fix the Plotly chart titles
  const scatterPlotData = [
    {
      x: filteredMetrics.map(m => m.growthScore),
      y: filteredMetrics.map(m => m.valueScore),
      text: filteredMetrics.map(m => m.ticker),
      mode: 'markers' as const,
      type: 'scatter' as const,
      marker: {
        size: 10,
        opacity: 0.6,
      },
      hovertemplate: '<b>%{text}</b><br>Growth Score: %{x:.1f}<br>Value Score: %{y:.1f}',
    }
  ];

  const scatterLayout = {
    title: {
      text: 'Value vs Growth Scores',
      font: { size: 24 }
    },
    xaxis: {
      title: {
        text: 'Growth Score',
        font: { size: 14 }
      }
    },
    yaxis: {
      title: {
        text: 'Value Score',
        font: { size: 14 }
      }
    },
    showlegend: false,
    hovermode: 'closest' as const
  };

  function calculateSectorAverages(stocks: ValueGrowthMetrics[]) {
    const sectorMap = new Map<string, { 
      count: number; 
      totalValue: number; 
      totalGrowth: number; 
      totalPeg: number;
    }>();

    stocks.forEach(stock => {
      if (!sectorMap.has(stock.sector)) {
        sectorMap.set(stock.sector, { 
          count: 0, 
          totalValue: 0, 
          totalGrowth: 0, 
          totalPeg: 0 
        });
      }
      const sectorData = sectorMap.get(stock.sector)!;
      sectorData.count++;
      sectorData.totalValue += stock.valueScore;
      sectorData.totalGrowth += stock.growthScore;
      sectorData.totalPeg += stock.pegRatio;
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      name: sector,
      avgValue: data.totalValue / data.count,
      avgGrowth: data.totalGrowth / data.count,
      avgPeg: data.totalPeg / data.count,
      stockCount: data.count,
    })).sort((a, b) => (b.avgValue + b.avgGrowth) - (a.avgValue + a.avgGrowth));
  }

  const handleSort = (field: keyof ValueGrowthMetrics) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSectorSort = (field: keyof SectorAnalysis) => {
    if (sectorSortField === field) {
      setSectorSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSectorSortField(field);
      setSectorSortDirection('desc');
    }
  };

  const sortedMetrics = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (typeof a[sortField] === 'string' && typeof b[sortField] === 'string') {
        return (a[sortField] as string).localeCompare(b[sortField] as string) * multiplier;
      }
      return ((a[sortField] as number) - (b[sortField] as number)) * multiplier;
    });
  }, [filteredMetrics, sortField, sortDirection]);

  const renderSortIcon = (field: keyof ValueGrowthMetrics) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <TriangleUpIcon ml={1} /> : <TriangleDownIcon ml={1} />;
  };

  const sortedSectorAnalysis = useMemo(() => {
    const sectorData = calculateSectorAverages(filteredMetrics);
    return [...sectorData].sort((a, b) => {
      const multiplier = sectorSortDirection === 'asc' ? 1 : -1;
      if (typeof a[sectorSortField] === 'string' && typeof b[sectorSortField] === 'string') {
        return (a[sectorSortField] as string).localeCompare(b[sectorSortField] as string) * multiplier;
      }
      return ((a[sectorSortField] as number) - (b[sectorSortField] as number)) * multiplier;
    });
  }, [filteredMetrics, sectorSortField, sectorSortDirection]);

  const renderSectorSortIcon = (field: keyof SectorAnalysis) => {
    if (sectorSortField !== field) return null;
    return sectorSortDirection === 'asc' ? <TriangleUpIcon ml={1} /> : <TriangleDownIcon ml={1} />;
  };

  if (loading) {
    return (
      <Box p={4}>
        <VStack spacing={4} align="stretch">
          <Heading size="lg" color="white">Value & Growth Analysis</Heading>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="400px"
          >
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" speed="0.65s" />
              <Text color="white" fontSize="lg">Analyzing value & growth metrics...</Text>
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={4} color="white">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg" color="white">Value & Growth Analysis</Heading>
          {!autoLoad && (
            <Button
              colorScheme="blue"
              onClick={fetchData}
              isLoading={loading}
              loadingText="Loading..."
            >
              Analyze Value & Growth
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
              <Heading size="md" mb={4} color="white">Top Value & Growth Stocks</Heading>
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
                        onClick={() => handleSort('valueScore')}
                      >
                        VALUE {renderSortIcon('valueScore')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('growthScore')}
                      >
                        GROWTH {renderSortIcon('growthScore')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('pegRatio')}
                      >
                        PEG {renderSortIcon('pegRatio')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedMetrics.map((stock) => (
                      <Tr key={stock.ticker}>
                        <Td color="white" fontWeight="bold">{stock.ticker}</Td>
                        <Td color="white">{stock.sector}</Td>
                        <Td color={stock.valueScore >= 70 ? "green.300" : 
                               stock.valueScore >= 50 ? "yellow.300" : "red.300"}>
                          {stock.valueScore.toFixed(1)}
                        </Td>
                        <Td color={stock.growthScore >= 70 ? "green.300" : 
                               stock.growthScore >= 50 ? "yellow.300" : "red.300"}>
                          {stock.growthScore.toFixed(1)}
                        </Td>
                        <Td color={stock.pegRatio <= 1 ? "green.300" : "yellow.300"}>
                          {stock.pegRatio.toFixed(2)}
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
                        onClick={() => handleSectorSort('avgValue')}
                      >
                        AVG VALUE {renderSectorSortIcon('avgValue')}
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
                    {sortedSectorAnalysis.map((sector) => (
                      <Tr key={sector.name}>
                        <Td color="white" fontWeight="bold">{sector.name}</Td>
                        <Td color={sector.avgValue >= 70 ? "green.300" : 
                               sector.avgValue >= 50 ? "yellow.300" : "red.300"}>
                          {sector.avgValue.toFixed(1)}
                        </Td>
                        <Td color={sector.avgGrowth >= 70 ? "green.300" : 
                               sector.avgGrowth >= 50 ? "yellow.300" : "red.300"}>
                          {sector.avgGrowth.toFixed(1)}
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
            <Heading size="md" color="white">Understanding Value vs Growth Analysis</Heading>
            
            <Text color="gray.300">
              Value vs Growth analysis helps identify stocks based on their fundamental characteristics and growth potential. Here's what each metric means:
            </Text>
            
            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Price-to-Earnings (P/E) Ratio:</Text>
                {" "}Compares a stock's price to its earnings per share. Lower P/E ratios typically indicate value stocks, while higher ratios suggest growth potential.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Price-to-Book (P/B) Ratio:</Text>
                {" "}Compares a stock's market value to its book value. Value stocks often have lower P/B ratios, indicating they might be undervalued.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Earnings Growth Rate:</Text>
                {" "}Measures the rate at which a company's earnings are increasing. Growth stocks typically show higher earnings growth rates.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Revenue Growth Rate:</Text>
                {" "}Shows how quickly a company's sales are increasing. Strong revenue growth is a key indicator of growth stocks.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Dividend Yield:</Text>
                {" "}The percentage of a stock's price paid out in dividends annually. Value stocks often have higher dividend yields.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Operating Margins:</Text>
                {" "}Indicates how efficiently a company converts revenue into profit. Value stocks typically have stable margins, while growth stocks might sacrifice margins for expansion.
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              A balanced portfolio often includes both value and growth stocks. Value stocks tend to be more established companies trading below their intrinsic value, while growth stocks are companies expected to grow faster than the market average. Consider your investment goals and risk tolerance when choosing between value and growth stocks.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
});

function calculateValueGrowthMetrics(stocks: StockData[]): ValueGrowthMetrics[] {
  return stocks
    .filter(stock => 
      stock.peg_ratio !== null && 
      stock.eps_growth_3y !== null && 
      stock.pe_forward !== null && 
      stock.pb_ratio !== null
    )
    .map(stock => {
      // Calculate value score (lower is better)
      const valueScore = normalizeScore([
        stock.pe_forward / 20, // Normalize PE to typical range
        stock.pb_ratio / 3,    // Normalize PB to typical range
        stock.peg_ratio        // PEG is already normalized-ish
      ]);

      // Calculate growth score (higher is better)
      const growthScore = normalizeScore([
        stock.eps_growth_3y / 30,  // Normalize EPS growth to typical range
        (stock.revenue_growth_3y || 0) / 20  // Normalize revenue growth
      ]);

      return {
        ticker: stock.ticker,
        sector: stock.sector,
        pegRatio: stock.peg_ratio,
        epsGrowth: stock.eps_growth_3y,
        peRatio: stock.pe_forward,
        pbRatio: stock.pb_ratio,
        valueScore,
        growthScore,
      };
    })
    .sort((a, b) => b.growthScore - a.growthScore);
}

function normalizeScore(metrics: number[]): number {
  const validMetrics = metrics.filter(m => !isNaN(m) && m !== null);
  if (validMetrics.length === 0) return 0;
  return validMetrics.reduce((a, b) => a + b, 0) / validMetrics.length * 100;
} 