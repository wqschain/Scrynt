'use client';

import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Text,
  Flex,
  IconButton,
  useColorModeValue,
  Tooltip,
  TableContainer,
} from '@chakra-ui/react';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { StockData } from '../services/stockService';
import { useState } from 'react';

interface StockTableProps {
  data: StockData[];
  onSort: (field: keyof StockData) => void;
  sortField: keyof StockData | null;
  sortDirection: 'asc' | 'desc';
}

export const StockTable = ({
  data,
  onSort,
  sortField,
  sortDirection,
}: StockTableProps) => {
  const bgColor = useColorModeValue('whiteAlpha.200', 'whiteAlpha.200');
  const borderColor = useColorModeValue('whiteAlpha.300', 'whiteAlpha.300');

  const renderSortIcon = (field: keyof StockData) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <TriangleUpIcon /> : <TriangleDownIcon />;
  };

  const formatChange = (value: number) => {
    const color = value >= 0 ? 'green.300' : 'red.300';
    return (
      <Text color={color}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </Text>
    );
  };

  const formatNumber = (value: number, prefix: string = '', decimals: number = 2) => {
    if (value >= 1e12) return `${prefix}${(value / 1e12).toFixed(decimals)}T`;
    if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(decimals)}B`;
    if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(decimals)}M`;
    return `${prefix}${value.toFixed(decimals)}`;
  };

  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th
              color="blue.200"
              cursor="pointer"
              onClick={() => onSort('ticker')}
            >
              TICKER {renderSortIcon('ticker')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              onClick={() => onSort('name')}
            >
              NAME {renderSortIcon('name')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              onClick={() => onSort('sector')}
            >
              SECTOR {renderSortIcon('sector')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('price')}
            >
              PRICE {renderSortIcon('price')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('market_cap')}
            >
              MARKET CAP {renderSortIcon('market_cap')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('pe_forward')}
            >
              P/E {renderSortIcon('pe_forward')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('dividend_yield')}
            >
              DIV YIELD {renderSortIcon('dividend_yield')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('change_1w')}
            >
              1W CHANGE {renderSortIcon('change_1w')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('change_1m')}
            >
              1M CHANGE {renderSortIcon('change_1m')}
            </Th>
            <Th 
              color="blue.200"
              cursor="pointer" 
              isNumeric 
              onClick={() => onSort('change_ytd')}
            >
              YTD CHANGE {renderSortIcon('change_ytd')}
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((stock) => (
            <Tr key={stock.ticker}>
              <Td color="white" fontWeight="bold">{stock.ticker}</Td>
              <Td color="white">{stock.name}</Td>
              <Td color="white">{stock.sector}</Td>
              <Td isNumeric color="white">${stock.price.toFixed(2)}</Td>
              <Td isNumeric color="white">{formatNumber(stock.market_cap, '$')}</Td>
              <Td isNumeric color="white">{stock.pe_forward.toFixed(2)}</Td>
              <Td isNumeric color="white">{stock.dividend_yield.toFixed(2)}%</Td>
              <Td isNumeric>{formatChange(stock.change_1w)}</Td>
              <Td isNumeric>{formatChange(stock.change_1m)}</Td>
              <Td isNumeric>{formatChange(stock.change_ytd)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}; 