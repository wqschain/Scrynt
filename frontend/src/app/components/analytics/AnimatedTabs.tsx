import { Box, useTab, useMultiStyleConfig, Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { forwardRef, useEffect, useRef, useState } from 'react';

const AnimatedTab = forwardRef((props: any, ref) => {
  const tabProps = useTab({ ...props, ref });

  return (
    <Button
      {...tabProps}
      position="relative"
      zIndex={1}
      mx={2}
      px={6}
      py={2}
      height="40px"
      bg="transparent"
      _selected={{
        color: 'white',
      }}
      _hover={{
        bg: 'whiteAlpha.100',
      }}
      fontSize="sm"
      fontWeight="medium"
      borderRadius="full"
    >
      {tabProps.children}
    </Button>
  );
});

AnimatedTab.displayName = 'AnimatedTab';

type TabLabel = 'Value vs Growth' | 'Dividends' | 'Risk/Return' | 'Momentum' | 'Scrynt Score' | 'Correlation & Clustering';

interface AnimatedTabIndicatorProps {
  activeTab: number;
  tabLabel: TabLabel;
  tabListRef: React.RefObject<HTMLDivElement>;
}

export const AnimatedTabIndicator = ({ activeTab, tabListRef }: AnimatedTabIndicatorProps) => {
  const [position, setPosition] = useState({ x: 0, width: 0 });

  useEffect(() => {
    if (tabListRef.current) {
      const tabs = tabListRef.current.querySelectorAll('button');
      if (tabs[activeTab]) {
        const tab = tabs[activeTab];
        const tabRect = tab.getBoundingClientRect();
        const listRect = tabListRef.current.getBoundingClientRect();
        
        setPosition({
          x: tab.offsetLeft,
          width: tabRect.width
        });
      }
    }
  }, [activeTab, tabListRef]);

  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      right="0"
      height="40px"
      pointerEvents="none"
    >
      <motion.div
        style={{
          height: '40px',
          borderRadius: '20px',
          position: 'absolute',
          backgroundColor: '#1A365D', // Chakra blue.900 for a darker blue
          zIndex: 0,
        }}
        initial={false}
        animate={{
          x: position.x,
          width: position.width
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30
        }}
      />
    </Box>
  );
};

export { AnimatedTab }; 