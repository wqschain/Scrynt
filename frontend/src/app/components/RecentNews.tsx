'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Link,
  Text,
  VStack,
  Skeleton,
  HStack,
  Image,
  AspectRatio,
  Heading,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

interface NewsItem {
  title: string;
  image_url: string;
  description: string;
  timestamp: string;
  source: string;
  url: string;
}

export default function RecentNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news/latest');
        if (!response.ok) throw new Error('Failed to fetch news');
        const data = await response.json();
        setNews(data);
      } catch (error) {
        console.error('Error fetching news:', error);
        setError('Failed to load news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <Box>
      <Heading size="lg" mb={6} px={4} color="white">
        Recent News
      </Heading>
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)"
        }}
        gap={4}
        px={4}
      >
        {loading ? (
          // Loading skeletons
          [...Array(8)].map((_, i) => (
            <GridItem key={i}>
              <Box 
                bg="whiteAlpha.100" 
                borderRadius="md" 
                overflow="hidden"
              >
                <Skeleton height="120px" />
                <Box p={3}>
                  <Skeleton height="16px" mb={2} />
                  <Skeleton height="16px" mb={2} />
                  <Skeleton height="12px" width="30%" />
                </Box>
              </Box>
            </GridItem>
          ))
        ) : error ? (
          <Text color="red.500">{error}</Text>
        ) : (
          // Actual news articles
          news.map((item, index) => (
            <GridItem key={index}>
              <Link 
                href={item.url} 
                isExternal 
                _hover={{ textDecoration: 'none' }}
              >
                <Box
                  bg="whiteAlpha.100"
                  borderRadius="md"
                  overflow="hidden"
                  transition="all 0.2s"
                  _hover={{
                    transform: 'translateY(-2px)',
                    bg: 'whiteAlpha.200',
                  }}
                >
                  {item.image_url && (
                    <AspectRatio ratio={16/9} maxH="120px">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        objectFit="cover"
                        width="100%"
                        fallback={<Box bg="gray.700" width="100%" height="100%" />}
                      />
                    </AspectRatio>
                  )}
                  <Box p={3}>
                    <VStack align="stretch" spacing={1.5}>
                      <HStack align="flex-start" spacing={2}>
                        <Text
                          fontWeight="semibold"
                          color="gray.100"
                          noOfLines={2}
                          fontSize="xs"
                          flex="1"
                        >
                          {item.title}
                        </Text>
                        <ExternalLinkIcon color="gray.400" boxSize={3} mt={0.5} />
                      </HStack>
                      <Text
                        color="gray.400"
                        fontSize="xs"
                        noOfLines={1}
                      >
                        {item.description}
                      </Text>
                      <HStack
                        justify="space-between"
                        color="gray.500"
                        fontSize="xs"
                        mt="auto"
                      >
                        <Text fontSize="2xs">{item.timestamp}</Text>
                        <Text fontSize="2xs">{item.source}</Text>
                      </HStack>
                    </VStack>
                  </Box>
                </Box>
              </Link>
            </GridItem>
          ))
        )}
      </Grid>
    </Box>
  );
} 