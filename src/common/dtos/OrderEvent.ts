interface OrderEvent {
    orderId: string;
    customerId: string;
    totalAmount: number;
    paymentMethod: string,
    items: any[];
    status: string
}