import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { Product } from '../App';

// A printable price list: products grouped by category and split into pages so a
// category header never sits alone at the bottom of a page.

export type PriceListCategoryGroup = {
  name: string;
  products: Product[];
};

type PriceListPrintRow =
  | {
      type: 'category';
      label: string;
    }
  | {
      type: 'product';
      product: Product;
    };

type PriceListPrintPage = {
  pageNumber: number;
  rows: PriceListPrintRow[];
  productCount: number;
};

type PriceListPrintContentProps = {
  storeName: string;
  storeAddress: string;
  pages: PriceListPrintPage[];
  totalProducts: number;
};

const PRICE_LIST_FIRST_PAGE_ROW_CAPACITY = 18;
const PRICE_LIST_OTHER_PAGE_ROW_CAPACITY = 24;

export const buildPriceListPages = (categories: PriceListCategoryGroup[]): PriceListPrintPage[] => {
  const pages: PriceListPrintPage[] = [];
  let currentPage: PriceListPrintPage = {
    pageNumber: 1,
    rows: [],
    productCount: 0,
  };

  const getPageCapacity = (pageNumber: number) =>
    pageNumber === 1 ? PRICE_LIST_FIRST_PAGE_ROW_CAPACITY : PRICE_LIST_OTHER_PAGE_ROW_CAPACITY;

  const pushCurrentPage = () => {
    if (currentPage.rows.length > 0) {
      pages.push(currentPage);
    }
  };

  const startNewPage = () => {
    pushCurrentPage();
    currentPage = {
      pageNumber: pages.length + 1,
      rows: [],
      productCount: 0,
    };
  };

  const ensureRoom = (requiredRows: number) => {
    const remainingRows = getPageCapacity(currentPage.pageNumber) - currentPage.rows.length;
    if (currentPage.rows.length > 0 && remainingRows < requiredRows) {
      startNewPage();
    }
  };

  const addCategoryRow = (categoryName: string, isContinued = false) => {
    currentPage.rows.push({
      type: 'category',
      label: isContinued ? `${categoryName} (continued)` : categoryName,
    });
  };

  for (const category of categories) {
    if (category.products.length === 0) {
      continue;
    }

    // Keep the category header with at least one product row whenever possible.
    ensureRoom(2);
    addCategoryRow(category.name);

    for (const product of category.products) {
      const remainingRows = getPageCapacity(currentPage.pageNumber) - currentPage.rows.length;
      if (remainingRows === 0) {
        startNewPage();
        addCategoryRow(category.name, true);
      }

      currentPage.rows.push({
        type: 'product',
        product,
      });
      currentPage.productCount += 1;
    }
  }

  pushCurrentPage();

  return pages;
};

export const PriceListPrintContent = React.forwardRef<HTMLDivElement, PriceListPrintContentProps>(
  ({ storeName, storeAddress, pages, totalProducts }, ref) => {
    const generatedAt = new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <Box
        ref={ref}
        sx={{
          bgcolor: 'common.white',
          color: 'text.primary',
          p: 3,
          minWidth: 820,
        }}
      >
        {pages.map((page, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <Box
              key={`price-list-page-${page.pageNumber}`}
              sx={{
                width: '100%',
                maxWidth: 900,
                mx: 'auto',
                mb: isLastPage ? 0 : 3,
                px: 3,
                py: 3.5,
                bgcolor: 'common.white',
                border: '1px solid',
                borderColor: 'grey.300',
                boxShadow: 2,
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                breakAfter: isLastPage ? 'auto' : 'page',
                '@media print': {
                  maxWidth: 'none',
                  minHeight: '277mm',
                  boxShadow: 'none',
                  border: 'none',
                  mb: 0,
                  px: 0,
                  py: 0,
                },
              }}
            >
              <Box
                sx={{
                  mb: 2,
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                  <Typography variant="h4" fontWeight={800}>
                    {storeName || 'Store Price List'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {storeAddress || 'Store Address'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Printed on {generatedAt}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Products on this page: {page.productCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>
                    Page {page.pageNumber} of {pages.length}
                  </Typography>
                </Box>
                {page.pageNumber === 1 && (
                  <Box
                    sx={{
                      mt: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total products: {totalProducts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total pages: {pages.length}
                    </Typography>
                  </Box>
                )}
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ width: '42%', fontWeight: 700, border: '1px solid', borderColor: 'grey.300' }}>Product</TableCell>
                      <TableCell sx={{ width: '38%', fontWeight: 700, border: '1px solid', borderColor: 'grey.300' }}>Barcode</TableCell>
                      <TableCell align="right" sx={{ width: '20%', fontWeight: 700, border: '1px solid', borderColor: 'grey.300' }}>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {page.rows.map((row, rowIndex) =>
                      row.type === 'category' ? (
                        <TableRow key={`category-${page.pageNumber}-${row.label}-${rowIndex}`}>
                          <TableCell
                            colSpan={3}
                            sx={{
                              px: 2,
                              py: 1,
                              fontWeight: 800,
                              bgcolor: 'grey.100',
                              border: '1px solid',
                              borderColor: 'grey.300',
                            }}
                          >
                            {row.label}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={row.product.id}>
                          <TableCell sx={{ border: '1px solid', borderColor: 'grey.300' }}>
                            {row.product.name}
                          </TableCell>
                          <TableCell sx={{ border: '1px solid', borderColor: 'grey.300' }}>
                            {row.product.barcodes.filter(Boolean).join(', ') || 'No barcode'}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ border: '1px solid', borderColor: 'grey.300', fontWeight: 700 }}
                          >
                            PHP {row.product.price.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  mt: 1.5,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Page {page.pageNumber} of {pages.length}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }
);

PriceListPrintContent.displayName = 'PriceListPrintContent';
