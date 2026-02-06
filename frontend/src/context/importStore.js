import { create } from 'zustand';

export const useImportStore = create((set) => ({
    invoiceData: {
        image: null,
        preview: null,
        results: null,
        proveedor: ''
    },
    setInvoiceData: (data) => set((state) => ({
        invoiceData: { ...state.invoiceData, ...data }
    })),
    clearInvoiceData: () => set({
        invoiceData: { image: null, preview: null, results: null, proveedor: '' }
    })
}));
