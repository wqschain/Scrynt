'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  VStack,
  Heading,
  useToast,
  Spinner,
  Center,
  Text,
  Button,
  HStack,
  Icon,
  Image,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { StockTable } from '../components/StockTable';
import { TableFilters } from '../components/TableFilters';
import { TablePagination } from '../components/TablePagination';
import {
  StockData,
  StockResponse,
  fetchStocks,
} from '../services/stockService';

export default function DashboardPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof StockData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Partial<Record<keyof StockData, string>>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sectors, setSectors] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetchStocks(
        filters,
        currentPage,
        pageSize,
        sortField || undefined,
        sortDirection === 'desc',
        forceRefresh
      );
      
      setStocks(response.data);
      setTotalPages(response.total_pages);
      setTotalCount(response.total_count);
      setLastUpdated(response.last_updated);
      
      // Extract unique sectors if on first page
      if (currentPage === 1) {
        const uniqueSectors = Array.from(
          new Set(response.data.map((stock) => stock.sector))
        ).filter(Boolean).sort();
        setSectors(uniqueSectors);
      }
      
      setError(null);

      if (forceRefresh) {
        toast({
          title: 'Data Refreshed',
          description: 'Stock data has been updated from the server.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      setError('Failed to load stock data');
      toast({
        title: 'Error',
        description: 'Failed to load stock data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast, filters, sortField, sortDirection, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = useCallback((field: keyof StockData) => {
    setSortDirection((prev) =>
      sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'
    );
    setSortField(field);
    setCurrentPage(1);
  }, [sortField]);

  const handleFilter = useCallback((newFilters: Partial<Record<keyof StockData, string>>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  if (loading && currentPage === 1) {
    return (
      <Center minH="calc(100vh - 4rem)">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch" w="full" p={4}>
        <Box>
          <HStack justify="space-between" align="flex-start">
            <Box>
              <Heading size="lg">Stock Market Screener</Heading>
              {lastUpdated && (
                <Text color="gray.500" fontSize="sm">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </Text>
              )}
              {totalCount > 0 && (
                <HStack color="gray.500" fontSize="sm" spacing={2} align="center">
                  <Text>Total stocks: {totalCount}</Text>
                  <Image 
                    src="/images/USflag.png" 
                    alt="US Stocks" 
                    width={6} 
                    height={3.5} 
                    style={{ display: 'inline' }}
                  />
                </HStack>
              )}
            </Box>
            <Button
              leftIcon={<Icon as={RepeatIcon} />}
              colorScheme="blue"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              loadingText="Refreshing"
            >
              Refresh Data
            </Button>
          </HStack>
        </Box>
        
        <TableFilters
          onFilter={handleFilter}
          onReset={handleResetFilters}
          sectors={sectors}
        />

        <Box position="relative">
          {(loading || isRefreshing) && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="blackAlpha.50"
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={1}
            >
              <Spinner />
            </Box>
          )}
          <Box overflowX="auto">
            <StockTable
              data={stocks}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
            />
          </Box>
        </Box>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </VStack>
    </Box>
  );
} 