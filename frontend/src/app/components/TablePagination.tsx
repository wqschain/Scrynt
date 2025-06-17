'use client';

import {
  HStack,
  Button,
  Text,
  Select,
  useColorModeValue,
} from '@chakra-ui/react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const TablePagination = ({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) => {
  const textColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <HStack spacing={4} justify="space-between" w="full" py={4}>
      <HStack spacing={2}>
        <Text color={textColor}>Rows per page:</Text>
        <Select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          w="auto"
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
        </Select>
      </HStack>

      <HStack spacing={2}>
        <Button
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
        >
          Previous
        </Button>
        <Text color={textColor}>
          Page {currentPage} of {totalPages}
        </Text>
        <Button
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
        >
          Next
        </Button>
      </HStack>
    </HStack>
  );
}; 