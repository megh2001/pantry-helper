import { Box } from "@mui/material";
import { ReactNode } from "react";

interface GridItemProps {
  children: ReactNode;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

// A simple replacement for Grid that uses flexbox
export const GridItem = ({
  children,
  xs = 12,
  sm = 6,
  md = 4,
  lg = 3,
  xl = 2,
}: GridItemProps) => {
  // Calculate width percentages based on the grid system (12 columns)
  const getWidth = (columns: number) => `${(columns / 12) * 100}%`;

  return (
    <Box
      sx={{
        width: getWidth(xs),
        padding: 1,
        "@media (min-width: 600px)": {
          width: sm ? getWidth(sm) : undefined,
        },
        "@media (min-width: 900px)": {
          width: md ? getWidth(md) : undefined,
        },
        "@media (min-width: 1200px)": {
          width: lg ? getWidth(lg) : undefined,
        },
        "@media (min-width: 1536px)": {
          width: xl ? getWidth(xl) : undefined,
        },
      }}
    >
      {children}
    </Box>
  );
};
