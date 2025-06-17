'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  HStack,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { StockData, fetchAllStocks } from '../../services/stockService';
import dynamic from 'next/dynamic';
import { SearchIcon } from '@chakra-ui/icons';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface CorrelationData {
  ticker: string;
  sector: string;
  correlations: { [key: string]: number };
}

interface ClusterData {
  name: string;
  sector: string;
  stocks: string[];
  avg_correlation: number;
  risk_score: number;
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sum_x = x.reduce((a, b) => a + b, 0);
  const sum_y = y.reduce((a, b) => a + b, 0);
  const sum_xy = x.reduce((acc, curr, i) => acc + curr * y[i], 0);
  const sum_x2 = x.reduce((a, b) => a + b * b, 0);
  const sum_y2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sum_xy - sum_x * sum_y;
  const denominator = Math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y));

  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateCorrelationClusters(stocks: StockData[]): ClusterData[] {
  // Group stocks by sector
  const stocksBySector = stocks.reduce((acc, stock) => {
    if (!acc[stock.sector]) {
      acc[stock.sector] = [];
    }
    acc[stock.sector].push(stock);
    return acc;
  }, {} as { [key: string]: StockData[] });

  // Calculate clusters for each sector
  const clusters: ClusterData[] = [];
  
  Object.entries(stocksBySector).forEach(([sector, sectorStocks]) => {
    // Calculate correlations between stocks in the sector
    const correlations: { [key: string]: { [key: string]: number } } = {};
    
    sectorStocks.forEach(stock1 => {
      correlations[stock1.ticker] = {};
      sectorStocks.forEach(stock2 => {
        if (stock1.ticker === stock2.ticker) {
          correlations[stock1.ticker][stock2.ticker] = 1;
        } else {
          const returns1 = [
            stock1.change_1w,
            stock1.change_1m,
            stock1.change_6m,
            stock1.change_ytd,
            stock1.change_1y,
          ];
          const returns2 = [
            stock2.change_1w,
            stock2.change_1m,
            stock2.change_6m,
            stock2.change_ytd,
            stock2.change_1y,
          ];
          correlations[stock1.ticker][stock2.ticker] = calculatePearsonCorrelation(returns1, returns2);
        }
      });
    });

    // Create clusters within sector
    const clusterSize = 5;
    for (let i = 0; i < sectorStocks.length; i += clusterSize) {
      const clusterStocks = sectorStocks.slice(i, i + clusterSize);
      if (clusterStocks.length < 2) continue;

      // Calculate average correlation within cluster
      let totalCorr = 0;
      let corrCount = 0;
      clusterStocks.forEach((stock1, idx1) => {
        clusterStocks.forEach((stock2, idx2) => {
          if (idx1 < idx2) {
            totalCorr += correlations[stock1.ticker][stock2.ticker];
            corrCount++;
          }
        });
      });

      const avgCorrelation = corrCount > 0 ? totalCorr / corrCount : 0;
      const riskScore = Math.min(100, avgCorrelation * 100);

      clusters.push({
        name: `${sector} Cluster ${Math.floor(i / clusterSize) + 1}`,
        sector,
        stocks: clusterStocks.map(s => s.ticker),
        avg_correlation: avgCorrelation,
        risk_score: riskScore,
      });
    }
  });

  return clusters.sort((a, b) => b.avg_correlation - a.avg_correlation);
}

function calculateSectorAverages(clusters: ClusterData[]) {
  const sectorMap = new Map<string, { 
    count: number; 
    totalCorrelation: number; 
    totalRiskScore: number;
    clusterCount: number;
  }>();

  clusters.forEach(cluster => {
    if (!sectorMap.has(cluster.sector)) {
      sectorMap.set(cluster.sector, { 
        count: 0, 
        totalCorrelation: 0, 
        totalRiskScore: 0,
        clusterCount: 0
      });
    }
    const sectorData = sectorMap.get(cluster.sector)!;
    sectorData.count += cluster.stocks.length;
    sectorData.totalCorrelation += cluster.avg_correlation;
    sectorData.totalRiskScore += cluster.risk_score;
    sectorData.clusterCount++;
  });

  return Array.from(sectorMap.entries()).map(([sector, data]) => ({
    name: sector,
    avgCorrelation: data.totalCorrelation / data.clusterCount,
    avgRiskScore: data.totalRiskScore / data.clusterCount,
    stockCount: data.count,
    clusterCount: data.clusterCount
  })).sort((a, b) => b.avgCorrelation - a.avgCorrelation);
}

export interface CorrelationClusteringViewRef {
  fetchData: () => Promise<void>;
}

export interface CorrelationClusteringViewProps {
  autoLoad?: boolean;
}

export const CorrelationClusteringView = forwardRef<CorrelationClusteringViewRef, CorrelationClusteringViewProps>((props, ref) => {
  const { autoLoad } = props;
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const toast = useToast();

  const fetchData = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await fetchAllStocks();
      setStocks(response.data);
      
      const calculatedClusters = calculateCorrelationClusters(response.data);
      setClusters(calculatedClusters);
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

  const filteredClusters = useMemo(() => {
    let filtered = selectedSector === 'All'
      ? clusters
      : clusters.filter(c => c.sector === selectedSector);

    if (searchQuery) {
      filtered = filtered.filter(cluster => 
        cluster.stocks.some(stock => 
          stock.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    return filtered;
  }, [clusters, selectedSector, searchQuery]);

  const sectors = useMemo(() => {
    return ['All', ...new Set(stocks.map(s => s.sector))].sort();
  }, [stocks]);

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
          <Heading size="lg" color="white">Correlation & Clustering Analysis</Heading>
          {!autoLoad && (
            <Button
              colorScheme="blue"
              onClick={fetchData}
              isLoading={loading}
              loadingText="Loading..."
            >
              Analyze Correlations
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

        <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4} width="100%">
          <GridItem>
            <Box bg="whiteAlpha.200" p={4} borderRadius="md" overflowX="auto">
              <Heading size="md" mb={4} color="white">Top Correlated Clusters</Heading>
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
                      <Th color="blue.200">CLUSTER</Th>
                      <Th color="blue.200">CORRELATION</Th>
                      <Th color="blue.200">RISK SCORE</Th>
                      <Th color="blue.200">STOCKS</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredClusters.map((cluster) => (
                      <Tr key={cluster.name}>
                        <Td color="white" fontWeight="bold">{cluster.name}</Td>
                        <Td color={cluster.avg_correlation >= 0.7 ? "yellow.300" : 
                               cluster.avg_correlation >= 0.5 ? "green.300" : "white"}>
                          {cluster.avg_correlation.toFixed(2)}
                        </Td>
                        <Td color={cluster.risk_score >= 70 ? "red.300" : 
                               cluster.risk_score >= 50 ? "yellow.300" : "green.300"}>
                          {cluster.risk_score.toFixed(1)}
                        </Td>
                        <Td color="white">{cluster.stocks.join(", ")}</Td>
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
                      <Th color="blue.200">SECTOR</Th>
                      <Th color="blue.200">AVG CORR</Th>
                      <Th color="blue.200">RISK SCORE</Th>
                      <Th color="blue.200">CLUSTERS</Th>
                      <Th color="blue.200">STOCKS</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {calculateSectorAverages(filteredClusters).map((sector) => (
                      <Tr key={sector.name}>
                        <Td color="white" fontWeight="bold">{sector.name}</Td>
                        <Td color={sector.avgCorrelation >= 0.7 ? "yellow.300" : 
                               sector.avgCorrelation >= 0.5 ? "green.300" : "white"}>
                          {sector.avgCorrelation.toFixed(2)}
                        </Td>
                        <Td color={sector.avgRiskScore >= 70 ? "red.300" : 
                               sector.avgRiskScore >= 50 ? "yellow.300" : "green.300"}>
                          {sector.avgRiskScore.toFixed(1)}
                        </Td>
                        <Td color="white">{sector.clusterCount}</Td>
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
            <Heading size="md" color="white">Understanding Correlation & Clustering Analysis</Heading>
            
            <Text color="gray.300">
              Correlation and clustering analysis helps understand relationships between stocks and identify groups with similar behavior patterns. Here's what each aspect means:
            </Text>
            
            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Price Correlation:</Text>
                {" "}Measures how closely two stocks' prices move together. A correlation of 1.0 means perfect positive correlation, -1.0 means perfect negative correlation, and 0 means no correlation.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Return Correlation:</Text>
                {" "}Shows how the percentage returns of stocks relate to each other. High correlation might indicate exposure to similar market factors or risks.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Sector Clustering:</Text>
                {" "}Groups stocks based on their sector and industry relationships. Stocks in the same cluster often react similarly to market events and economic changes.
              </ListItem>
              
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Factor Clustering:</Text>
                {" "}Groups stocks based on their sensitivity to various market factors like growth, value, momentum, and quality. Helps identify stocks with similar risk-return characteristics.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Volatility Clustering:</Text>
                {" "}Shows how stocks group together based on their price volatility patterns. Useful for risk management and portfolio diversification.
              </ListItem>

              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Beta Clustering:</Text>
                {" "}Groups stocks based on their market sensitivity (beta). Helps understand which stocks might react similarly to market movements.
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              Applications in Portfolio Management:
            </Text>

            <UnorderedList color="gray.300" spacing={2}>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Diversification:</Text>
                {" "}Choose stocks from different clusters to reduce portfolio risk
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Risk Management:</Text>
                {" "}Identify potential concentration risks in your portfolio
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Pair Trading:</Text>
                {" "}Find highly correlated stocks for potential pair trading strategies
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="bold" color="white">Sector Rotation:</Text>
                {" "}Understand sector relationships for tactical asset allocation
              </ListItem>
            </UnorderedList>
            
            <Text color="gray.300" mt={2}>
              Understanding correlations and clusters can help build more resilient portfolios through proper diversification. However, correlations can change over time, especially during market stress, so regular monitoring and rebalancing may be necessary.
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
            <Text color="white" fontSize="lg">Analyzing correlations and clusters...</Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
});

CorrelationClusteringView.displayName = 'CorrelationClusteringView'; 