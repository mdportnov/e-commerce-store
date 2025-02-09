interface InvoiceEvent {
    invoiceId: string;
    orderId: string;
    amount: number;
    status: string;
    customerId: string;
}