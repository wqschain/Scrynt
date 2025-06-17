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
} from '@chakra-ui/react';
import { StockData, fetchAllStocks } from '../../services/stockService';
import { calculateRiskReturnMetrics as calculateStockMetrics } from '../../utils/financialMetrics';
import dynamic from 'next/dynamic';
import { SearchIcon, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface RiskReturnMetrics {
  ticker: string;
  sector: string;
  beta: number;
  annualReturn: number;
  riskAdjustedReturn: number;
  sharpeRatio: number;
}

interface SectorAnalysis {
  name: string;
  avgBeta: number;
  avgReturn: number;
  avgSharpe: number;
  stockCount: number;
}

type SortableStockField = keyof RiskReturnMetrics;
type SortableSectorField = keyof SectorAnalysis;

export interface RiskReturnViewRef {
  fetchData: () => Promise<void>;
}

export interface RiskReturnViewProps {
  autoLoad?: boolean;
}

export const RiskReturnView = forwardRef<RiskReturnViewRef, RiskReturnViewProps>((props, ref) => {
  const { autoLoad } = props;
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [metrics, setMetrics] = useState<RiskReturnMetrics[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortableStockField>('sharpeRatio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sectorSortField, setSectorSortField] = useState<SortableSectorField>('avgSharpe');
  const [sectorSortDirection, setSectorSortDirection] = useState<'asc' | 'desc'>('desc');
  const toast = useToast();

  const fetchData = async () => {
    if (loading) return; // Prevent multiple simultaneous fetches
    
    try {
      setLoading(true);
      const response = await fetchAllStocks();
      setStocks(response.data);
      
      // Calculate risk/return metrics
      const calculatedMetrics = calculateRiskReturnMetrics(response.data);
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

  function calculateRiskReturnMetrics(stocks: StockData[]): RiskReturnMetrics[] {
    return stocks
      .filter(stock => 
        stock.change_1y !== null && 
        stock.change_1m !== null && 
        stock.change_6m !== null
      )
      .map(stock => {
        const metrics = calculateStockMetrics(stock);
        
        return {
          ticker: stock.ticker,
          sector: stock.sector,
          beta: stock.beta,
          annualReturn: metrics.annualReturn * 100, // Convert back to percentage
          riskAdjustedReturn: metrics.riskAdjustedReturn !== null ? metrics.riskAdjustedReturn * 100 : 0,
          sharpeRatio: metrics.sharpeRatio !== null ? metrics.sharpeRatio : 0,
        };
      })
      .sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  }

  function calculateSectorAverages(stocks: RiskReturnMetrics[]) {
    const sectorMap = new Map<string, { count: number; totalBeta: number; totalReturn: number; totalSharpe: number }>();

    stocks.forEach(stock => {
      if (!sectorMap.has(stock.sector)) {
        sectorMap.set(stock.sector, { count: 0, totalBeta: 0, totalReturn: 0, totalSharpe: 0 });
      }
      const sectorData = sectorMap.get(stock.sector)!;
      sectorData.count++;
      sectorData.totalBeta += stock.beta;
      sectorData.totalReturn += stock.annualReturn;
      sectorData.totalSharpe += stock.sharpeRatio;
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      name: sector,
      avgBeta: data.totalBeta / data.count,
      avgReturn: data.totalReturn / data.count,
      avgSharpe: data.totalSharpe / data.count,
      stockCount: data.count,
    })).sort((a, b) => b.avgSharpe - a.avgSharpe);
  }

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

  const sectorAverages = useMemo(() => {
    return calculateSectorAverages(filteredMetrics);
  }, [filteredMetrics]);

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
      switch (sectorSortField) {
        case 'name':
          return a.name.localeCompare(b.name) * multiplier;
        case 'avgBeta':
          return (a.avgBeta - b.avgBeta) * multiplier;
        case 'avgReturn':
          return (a.avgReturn - b.avgReturn) * multiplier;
        case 'avgSharpe':
          return (a.avgSharpe - b.avgSharpe) * multiplier;
        case 'stockCount':
          return (a.stockCount - b.stockCount) * multiplier;
        default:
          return 0;
      }
    });
  }, [sectorAverages, sectorSortField, sectorSortDirection]);

  useImperativeHandle(ref, () => ({
    fetchData
  }));

  useEffect(() => {
    if (autoLoad) {
      fetchData();
    }
  }, [autoLoad]);

  return (
    <Box p={4} color="white">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg" color="white">Risk & Return Analysis</Heading>
          {!autoLoad && (
            <Button
              colorScheme="blue"
              onClick={fetchData}
              isLoading={loading}
              loadingText="Loading..."
            >
              Analyze Risk & Return
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
              <Heading size="md" mb={4} color="white">Risk-Return Analysis</Heading>
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
                        onClick={() => handleSort('beta')}
                      >
                        BETA {renderSortIcon('beta')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('annualReturn')}
                      >
                        RETURN {renderSortIcon('annualReturn')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('sharpeRatio')}
                      >
                        SHARPE {renderSortIcon('sharpeRatio')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedMetrics.map((stock) => (
                      <Tr key={stock.ticker}>
                        <Td color="white" fontWeight="bold">{stock.ticker}</Td>
                        <Td color="white">{stock.sector}</Td>
                        <Td color={stock.beta <= 1 ? "green.300" : "yellow.300"}>
                          {stock.beta.toFixed(2)}
                        </Td>
                        <Td color={stock.annualReturn >= 0 ? "green.300" : "red.300"}>
                          {stock.annualReturn.toFixed(2)}%
                        </Td>
                        <Td color={stock.sharpeRatio >= 1 ? "green.300" : "yellow.300"}>
                          {stock.sharpeRatio.toFixed(2)}
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
              <Heading size="md" mb={4} color="white">Sector Risk Analysis</Heading>
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
                        onClick={() => handleSectorSort('avgBeta')}
                      >
                        AVG BETA {renderSectorSortIcon('avgBeta')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgReturn')}
                      >
                        AVG RETURN {renderSectorSortIcon('avgReturn')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgSharpe')}
                      >
                        AVG SHARPE {renderSectorSortIcon('avgSharpe')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedSectorAverages.map((sector) => (
                      <Tr key={sector.name}>
                        <Td color="white" fontWeight="bold">{sector.name}</Td>
                        <Td color={sector.avgBeta <= 1 ? "green.300" : "yellow.300"}>
                          {sector.avgBeta.toFixed(2)}
                        </Td>
                        <Td color={sector.avgReturn >= 0 ? "green.300" : "red.300"}>
                          {sector.avgReturn.toFixed(2)}%
                        </Td>
                        <Td color={sector.avgSharpe >= 1 ? "green.300" : "yellow.300"}>
                          {sector.avgSharpe.toFixed(2)}
                        </Td>
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
            <Heading size="md" color="white">Understanding Risk & Return Analysis</Heading>
            
            <Text color="gray.300">
              Risk/Return analysis helps evaluate the potential rewards of an investment against its risks. Here's what each metric means:
            </Text>
            
            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Beta:</Text>
                {" "}Measures a stock's volatility compared to the overall market. A beta of 1.0 means the stock moves with the market, while higher values indicate greater volatility and lower values indicate less volatility.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Sharpe Ratio:</Text>
                {" "}Evaluates risk-adjusted return by comparing excess returns to standard deviation. A higher Sharpe ratio indicates better return per unit of risk.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Standard Deviation:</Text>
                {" "}Measures the historical volatility of returns. Higher standard deviation suggests more price fluctuation and potentially higher risk.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Maximum Drawdown:</Text>
                {" "}The largest peak-to-trough decline in the stock's value. Shows the worst historical loss scenario and helps assess downside risk.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Alpha:</Text>
                {" "}Represents the excess return of an investment relative to its benchmark. Positive alpha indicates outperformance, while negative alpha suggests underperformance.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Value at Risk (VaR):</Text>
                {" "}Estimates the potential loss in value over a defined time period. Helps understand the probability of different loss scenarios.
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              When analyzing risk and return, it's important to consider your investment horizon and risk tolerance. Higher potential returns often come with higher risk. A well-diversified portfolio can help manage risk while maintaining return potential. Remember that historical performance doesn't guarantee future results.
            </Text>
          </VStack>
        </Box>
      </VStack>

      {loading && (
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
            <Text color="white" fontSize="lg">Analyzing risk and return metrics...</Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
}); 