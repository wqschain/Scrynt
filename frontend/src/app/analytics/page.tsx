'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  Container,
  useToast,
  Spinner,
  VStack,
  Text,
} from '@chakra-ui/react';

// Import view components
import { ValueGrowthView } from '../components/analytics/ValueGrowthView';
import { DividendView } from '../components/analytics/DividendView';
import { RiskReturnView } from '../components/analytics/RiskReturnView';
import { MomentumView } from '../components/analytics/MomentumView';
import { CompositeScoreView } from '../components/analytics/CompositeScoreView';
import { CorrelationClusteringView } from '../components/analytics/CorrelationClusteringView';
import { AnimatedTab, AnimatedTabIndicator } from '../components/analytics/AnimatedTabs';
import { fetchAllStocks } from '../services/stockService';

const TAB_ITEMS = [
  { label: 'Value vs Growth' as const, component: ValueGrowthView },
  { label: 'Dividends' as const, component: DividendView },
  { label: 'Risk/Return' as const, component: RiskReturnView },
  { label: 'Momentum' as const, component: MomentumView },
  { label: 'Scrynt Score' as const, component: CompositeScoreView },
  { label: 'Correlation & Clustering' as const, component: CorrelationClusteringView },
] as const;

export default function AnalyticsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const response = await fetchAllStocks();
        if (!response.data.length) {
          throw new Error('No data received');
        }
      } catch (err) {
        setError('Failed to load analytics data');
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [toast]);

  if (loading) {
    return (
      <Box
        w="100%"
        h="calc(100vh - 64px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" speed="0.65s" />
          <Text color="white" fontSize="lg">Loading analytics data...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        w="100%"
        h="calc(100vh - 64px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="red.400" fontSize="lg">{error}</Text>
      </Box>
    );
  }

  return (
    <Box w="100%" py={4}>
      <Heading mb={6} px={2}>Stock Analytics</Heading>
      
      <Box 
        overflowX="auto" 
        sx={{
          '&::-webkit-scrollbar': {
            height: '8px',
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'whiteAlpha.100',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'whiteAlpha.300',
            borderRadius: '8px',
            '&:hover': {
              background: 'whiteAlpha.400',
            },
          },
        }}
      >
        <Tabs 
          index={tabIndex} 
          onChange={setTabIndex}
          variant="unstyled"
          isLazy
        >
          <Box position="relative" ref={tabListRef}>
            <TabList mb={4} whiteSpace="nowrap" px={2} position="relative" zIndex={2}>
              {TAB_ITEMS.map((tab, index) => (
                <AnimatedTab key={index}>{tab.label}</AnimatedTab>
              ))}
            </TabList>
            <AnimatedTabIndicator 
              activeTab={tabIndex} 
              tabLabel={TAB_ITEMS[tabIndex].label}
              tabListRef={tabListRef}
            />
          </Box>

          <TabPanels>
            {TAB_ITEMS.map((tab, index) => (
              <TabPanel key={index} px={0}>
                <tab.component autoLoad />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
} 