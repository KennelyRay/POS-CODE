export {};

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

interface ReceiptData {
  id: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  customerMoney?: number;
  change?: number;
  storeName?: string;
  storeAddress?: string;
  qrData?: string;
}

declare global {
  interface Window {
    electronAPI: {
      // Printer management
      getPrinters: () => Promise<Printer[]>;
      
      // Receipt printing
      printReceipt: (receiptData: ReceiptData, printerName?: string) => Promise<boolean>;
      
      // Test printing
      testPrint: (printerName?: string) => Promise<boolean>;
      
      // Cash drawer
      openCashDrawer: (printerName?: string) => Promise<boolean>;
    };
  }
}
