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
  Progress,
  HStack,
  Button,
  Select,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { StockData, fetchAllStocks } from '../../services/stockService';
import dynamic from 'next/dynamic';
import { SearchIcon, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ScoreComponents {
  value: number;      // Value metrics (PE, PB, etc.)
  growth: number;     // Growth metrics (EPS, Revenue)
  quality: number;    // Quality metrics (ROE, ROA)
  momentum: number;   // Price momentum
  stability: number;  // Beta and volatility
}

interface CompositeScore {
  ticker: string;
  sector: string;
  totalScore: number;
  components: ScoreComponents;
}

interface SectorAnalysis {
  name: string;
  avgScore: number;
  avgComponents: {
    value: number;
    growth: number;
    quality: number;
    momentum: number;
    stability: number;
  };
  stockCount: number;
}

export interface CompositeScoreViewRef {
  fetchData: () => Promise<void>;
}

export interface CompositeScoreViewProps {
  autoLoad?: boolean;
}

type SortableStockField = keyof CompositeScore | 'components.value' | 'components.growth';
type SortableSectorField = keyof SectorAnalysis | 'avgValue' | 'avgGrowth';

export const CompositeScoreView = forwardRef<CompositeScoreViewRef, CompositeScoreViewProps>((props, ref) => {
  const { autoLoad } = props;
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [scores, setScores] = useState<CompositeScore[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortableStockField>('totalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sectorSortField, setSectorSortField] = useState<SortableSectorField>('avgScore');
  const [sectorSortDirection, setSectorSortDirection] = useState<'asc' | 'desc'>('desc');
  const toast = useToast();

  const fetchData = async () => {
    if (loading) return; // Prevent multiple simultaneous fetches
    
    try {
      setLoading(true);
      const response = await fetchAllStocks();
      setStocks(response.data);
      
      // Calculate composite scores
      const calculatedScores = calculateCompositeScores(response.data);
      setScores(calculatedScores);
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

  const filteredScores = useMemo(() => {
    let filtered = selectedSector === 'All'
      ? scores
      : scores.filter(m => m.sector === selectedSector);

    if (searchQuery) {
      filtered = filtered.filter(score => 
        score.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [scores, selectedSector, searchQuery]);

  // Get unique sectors for the dropdown
  const sectors = useMemo(() => {
    return ['All', ...new Set(stocks.map(s => s.sector))].sort();
  }, [stocks]);

  function normalizeMetric(value: number, min: number, max: number): number {
    return ((value - min) / (max - min)) * 100;
  }

  function calculateCompositeScores(stocks: StockData[]): CompositeScore[] {
    // Filter out stocks with missing data
    const validStocks = stocks.filter(stock => 
      stock.pe_forward !== null &&
      stock.pb_ratio !== null &&
      stock.peg_ratio !== null &&
      stock.eps_growth_3y !== null &&
      stock.revenue_growth_3y !== null &&
      stock.roe !== null &&
      stock.roa !== null &&
      stock.change_1y !== null &&
      stock.beta !== null
    );

    // Calculate min/max values for normalization
    const metrics = {
      pe: { min: Math.min(...validStocks.map(s => s.pe_forward)), max: Math.max(...validStocks.map(s => s.pe_forward)) },
      pb: { min: Math.min(...validStocks.map(s => s.pb_ratio)), max: Math.max(...validStocks.map(s => s.pb_ratio)) },
      peg: { min: Math.min(...validStocks.map(s => s.peg_ratio)), max: Math.max(...validStocks.map(s => s.peg_ratio)) },
      epsGrowth: { min: Math.min(...validStocks.map(s => s.eps_growth_3y)), max: Math.max(...validStocks.map(s => s.eps_growth_3y)) },
      revGrowth: { min: Math.min(...validStocks.map(s => s.revenue_growth_3y)), max: Math.max(...validStocks.map(s => s.revenue_growth_3y)) },
      roe: { min: Math.min(...validStocks.map(s => s.roe)), max: Math.max(...validStocks.map(s => s.roe)) },
      roa: { min: Math.min(...validStocks.map(s => s.roa)), max: Math.max(...validStocks.map(s => s.roa)) },
      momentum: { min: Math.min(...validStocks.map(s => s.change_1y)), max: Math.max(...validStocks.map(s => s.change_1y)) },
    };

    return validStocks.map(stock => {
      // Calculate component scores
      const valueScore = (
        (100 - normalizeMetric(stock.pe_forward, metrics.pe.min, metrics.pe.max)) +
        (100 - normalizeMetric(stock.pb_ratio, metrics.pb.min, metrics.pb.max)) +
        (100 - normalizeMetric(stock.peg_ratio, metrics.peg.min, metrics.peg.max))
      ) / 3;

      const growthScore = (
        normalizeMetric(stock.eps_growth_3y, metrics.epsGrowth.min, metrics.epsGrowth.max) +
        normalizeMetric(stock.revenue_growth_3y, metrics.revGrowth.min, metrics.revGrowth.max)
      ) / 2;

      const qualityScore = (
        normalizeMetric(stock.roe, metrics.roe.min, metrics.roe.max) +
        normalizeMetric(stock.roa, metrics.roa.min, metrics.roa.max)
      ) / 2;

      const momentumScore = normalizeMetric(stock.change_1y, metrics.momentum.min, metrics.momentum.max);

      const stabilityScore = 100 - Math.abs(stock.beta - 1) * 50; // Higher score when beta is closer to 1

      // Calculate total score with weights
      const components = {
        value: valueScore,
        growth: growthScore,
        quality: qualityScore,
        momentum: momentumScore,
        stability: stabilityScore,
      };

      const totalScore = (
        valueScore * 0.25 +     // 25% weight on value
        growthScore * 0.25 +    // 25% weight on growth
        qualityScore * 0.20 +   // 20% weight on quality
        momentumScore * 0.15 +  // 15% weight on momentum
        stabilityScore * 0.15   // 15% weight on stability
      );

      return {
        ticker: stock.ticker,
        sector: stock.sector,
        totalScore,
        components,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }

  function calculateSectorAverages(scores: CompositeScore[]): SectorAnalysis[] {
    const sectorMap = new Map<string, { 
      count: number; 
      totalScore: number;
      totalComponents: {
        value: number;
        growth: number;
        quality: number;
        momentum: number;
        stability: number;
      }
    }>();

    scores.forEach(score => {
      if (!sectorMap.has(score.sector)) {
        sectorMap.set(score.sector, { 
          count: 0, 
          totalScore: 0,
          totalComponents: {
            value: 0,
            growth: 0,
            quality: 0,
            momentum: 0,
            stability: 0
          }
        });
      }
      const sectorData = sectorMap.get(score.sector)!;
      sectorData.count++;
      sectorData.totalScore += score.totalScore;
      sectorData.totalComponents.value += score.components.value;
      sectorData.totalComponents.growth += score.components.growth;
      sectorData.totalComponents.quality += score.components.quality;
      sectorData.totalComponents.momentum += score.components.momentum;
      sectorData.totalComponents.stability += score.components.stability;
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      name: sector,
      avgScore: data.totalScore / data.count,
      avgComponents: {
        value: data.totalComponents.value / data.count,
        growth: data.totalComponents.growth / data.count,
        quality: data.totalComponents.quality / data.count,
        momentum: data.totalComponents.momentum / data.count,
        stability: data.totalComponents.stability / data.count,
      },
      stockCount: data.count
    })).sort((a, b) => b.avgScore - a.avgScore);
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

  const sortedScores = useMemo(() => {
    return [...filteredScores].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'ticker' || sortField === 'sector') {
        return (a[sortField].localeCompare(b[sortField])) * multiplier;
      }
      if (sortField === 'components.value') {
        return (a.components.value - b.components.value) * multiplier;
      }
      if (sortField === 'components.growth') {
        return (a.components.growth - b.components.growth) * multiplier;
      }
      return ((a[sortField as keyof CompositeScore] as number) - (b[sortField as keyof CompositeScore] as number)) * multiplier;
    });
  }, [filteredScores, sortField, sortDirection]);

  const sortedSectorAverages = useMemo(() => {
    const sectorData = calculateSectorAverages(filteredScores);
    return [...sectorData].sort((a, b) => {
      const multiplier = sectorSortDirection === 'asc' ? 1 : -1;
      if (sectorSortField === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      }
      if (sectorSortField === 'avgValue') {
        return (a.avgComponents.value - b.avgComponents.value) * multiplier;
      }
      if (sectorSortField === 'avgGrowth') {
        return (a.avgComponents.growth - b.avgComponents.growth) * multiplier;
      }
      return ((a[sectorSortField as keyof SectorAnalysis] as number) - (b[sectorSortField as keyof SectorAnalysis] as number)) * multiplier;
    });
  }, [filteredScores, sectorSortField, sectorSortDirection]);

  useImperativeHandle(ref, () => ({
    fetchData
  }));

  useEffect(() => {
    if (autoLoad) {
      fetchData();
    }
  }, [autoLoad]);

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
          <Text color="white" fontSize="lg">Calculating composite scores...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={4} color="white">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg" color="white">Scrynt Score Analysis</Heading>
          {!autoLoad && (
            <Button
              colorScheme="blue"
              onClick={fetchData}
              isLoading={loading}
              loadingText="Loading..."
            >
              Calculate Scores
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
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: "whiteAlpha.300" }}
                _placeholder={{ color: "gray.400" }}
              />
            </InputGroup>
          </HStack>
        )}

        <Grid templateColumns="repeat(2, 1fr)" gap={6}>
          <GridItem>
            <Box bg="whiteAlpha.200" p={4} borderRadius="md" overflowX="auto">
              <Heading size="md" mb={4} color="white">Top Scrynt Score Stocks</Heading>
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
                        onClick={() => handleSort('totalScore')}
                      >
                        TOTAL SCORE {renderSortIcon('totalScore')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('components.value')}
                      >
                        VALUE {renderSortIcon('components.value')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSort('components.growth')}
                      >
                        GROWTH {renderSortIcon('components.growth')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedScores.map((score) => (
                      <Tr key={score.ticker}>
                        <Td color="white" fontWeight="bold">{score.ticker}</Td>
                        <Td color="white">{score.sector}</Td>
                        <Td color={score.totalScore >= 70 ? "green.300" : 
                               score.totalScore >= 50 ? "yellow.300" : "red.300"}>
                          {score.totalScore.toFixed(1)}
                        </Td>
                        <Td color={score.components.value >= 70 ? "green.300" : 
                               score.components.value >= 50 ? "yellow.300" : "red.300"}>
                          {score.components.value.toFixed(1)}
                        </Td>
                        <Td color={score.components.growth >= 70 ? "green.300" : 
                               score.components.growth >= 50 ? "yellow.300" : "red.300"}>
                          {score.components.growth.toFixed(1)}
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
              <TableContainer minWidth="100%">
                <Table variant="simple" size="sm">
                  <Thead>
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
                        onClick={() => handleSectorSort('avgScore')}
                      >
                        AVG SCORE {renderSectorSortIcon('avgScore')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgValue')}
                      >
                        VALUE {renderSectorSortIcon('avgValue')}
                      </Th>
                      <Th 
                        color="blue.200"
                        cursor="pointer"
                        onClick={() => handleSectorSort('avgGrowth')}
                      >
                        GROWTH {renderSectorSortIcon('avgGrowth')}
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
                        <Td color={sector.avgScore >= 70 ? "green.300" : 
                               sector.avgScore >= 50 ? "yellow.300" : "red.300"}>
                          {sector.avgScore.toFixed(1)}
                        </Td>
                        <Td color={sector.avgComponents.value >= 70 ? "green.300" : 
                               sector.avgComponents.value >= 50 ? "yellow.300" : "red.300"}>
                          {sector.avgComponents.value.toFixed(1)}
                        </Td>
                        <Td color={sector.avgComponents.growth >= 70 ? "green.300" : 
                               sector.avgComponents.growth >= 50 ? "yellow.300" : "red.300"}>
                          {sector.avgComponents.growth.toFixed(1)}
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
            <Heading size="md" color="white">Understanding the Scrynt Score</Heading>
            
            <Text color="gray.300">
              The Scrynt Score is a comprehensive rating system that combines multiple factors to evaluate a stock's overall investment potential. Here's how the score is calculated:
            </Text>
            
            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Value Component (30%):</Text>
                {" "}Evaluates traditional value metrics including P/E ratio, P/B ratio, and profit margins. Lower valuations relative to peers contribute to a higher score.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Growth Component (25%):</Text>
                {" "}Assesses revenue growth, earnings growth, and future growth projections. Strong and sustainable growth rates improve this component.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Quality Component (20%):</Text>
                {" "}Measures financial health through metrics like return on equity, debt levels, and operating efficiency. Higher quality companies score better here.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Momentum Component (15%):</Text>
                {" "}Tracks price momentum, earnings momentum, and analyst estimate revisions. Positive trends boost this score component.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Income Component (10%):</Text>
                {" "}Evaluates dividend yield, dividend growth, and payout sustainability for income-generating potential.
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              Score Interpretation:
            </Text>

            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">90-100:</Text>
                {" "}Exceptional - Strong performance across all components
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">80-89:</Text>
                {" "}Very Good - Strong in most areas with minor weaknesses
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">70-79:</Text>
                {" "}Good - Solid performance with some areas for improvement
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">60-69:</Text>
                {" "}Fair - Mixed performance with notable weaknesses
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Below 60:</Text>
                {" "}Weak - Significant concerns in multiple areas
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              The Scrynt Score provides a balanced view of a stock's investment potential, but should be used alongside other analysis tools and your own research. Market conditions, industry trends, and company-specific factors can all impact future performance regardless of the score.
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
            <Text color="white" fontSize="lg">Calculating Scrynt Scores...</Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
}); 