interface PaymentEvent {
    orderId: string;
    invoiceId: string;
    paymentStatus: string;
    paidAt: string;
    customerId: string;
}