import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface Printer {
  type: string;
  name: string;
  connection: string;
  manufacturer: string;
  product: string;
  isDefault: boolean;
  vendor_id?: string;
  product_id?: string;
}

interface PrinterContextType {
  printers: Printer[];
  selectedPrinter: string | null;
  isLoading: boolean;
  setSelectedPrinter: (printerName: string | null) => void;
  refreshPrinters: () => Promise<void>;
  printReceipt: (receiptData: any) => Promise<boolean>;
  testPrint: () => Promise<boolean>;
  openCashDrawer: () => Promise<boolean>;
}

const PrinterContext = createContext<PrinterContextType | null>(null);

export const usePrinter = (): PrinterContextType => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

interface PrinterProviderProps {
  children: ReactNode;
}

export const PrinterProvider: React.FC<PrinterProviderProps> = ({ children }) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved printer selection from localStorage
  useEffect(() => {
    const savedPrinter = localStorage.getItem('selectedPrinter');
    if (savedPrinter) {
      setSelectedPrinter(savedPrinter);
    }
  }, []);

  // Save printer selection to localStorage
  useEffect(() => {
    if (selectedPrinter) {
      localStorage.setItem('selectedPrinter', selectedPrinter);
    } else {
      localStorage.removeItem('selectedPrinter');
    }
  }, [selectedPrinter]);

  const refreshPrinters = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.getPrinters) {
        const detectedPrinters = await window.electronAPI.getPrinters();
        setPrinters(detectedPrinters);
        
        // Auto-select default printer if none selected
        if (!selectedPrinter && detectedPrinters.length > 0) {
          const defaultPrinter = detectedPrinters.find(p => p.isDefault) || detectedPrinters[0];
          setSelectedPrinter(defaultPrinter.name);
        }
        
        // Check if selected printer is still available
        if (selectedPrinter && !detectedPrinters.some(p => p.name === selectedPrinter)) {
          const newDefault = detectedPrinters.find(p => p.isDefault) || detectedPrinters[0];
          setSelectedPrinter(newDefault?.name || null);
        }
      }
    } catch (error) {
      console.error('Error refreshing printers:', error);
      setPrinters([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter]);

  // Load printers on mount
  useEffect(() => {
    refreshPrinters();
  }, [refreshPrinters]);

  const printReceipt = async (receiptData: any): Promise<boolean> => {
    if (!window.electronAPI || !window.electronAPI.printReceipt) {
      console.error('Printing API not available');
      return false;
    }
    
    try {
      const success = await window.electronAPI.printReceipt(receiptData, selectedPrinter || undefined);
      return success;
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  };

  const testPrint = async (): Promise<boolean> => {
    if (!window.electronAPI || !window.electronAPI.testPrint) {
      console.error('Test print API not available');
      return false;
    }
    
    try {
      const success = await window.electronAPI.testPrint(selectedPrinter || undefined);
      return success;
    } catch (error) {
      console.error('Error test printing:', error);
      return false;
    }
  };

  const openCashDrawer = async (): Promise<boolean> => {
    if (!window.electronAPI || !window.electronAPI.openCashDrawer) {
      console.error('Cash drawer API not available');
      return false;
    }
    
    try {
      const success = await window.electronAPI.openCashDrawer(selectedPrinter || undefined);
      return success;
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      return false;
    }
  };

  const value: PrinterContextType = {
    printers,
    selectedPrinter,
    isLoading,
    setSelectedPrinter,
    refreshPrinters,
    printReceipt,
    testPrint,
    openCashDrawer,
  };

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
}; 
