interface OrderRequest {
    customerId: string;
    items: OrderItem[];
    paymentMethod: string;
}

interface OrderItem {
    productId: string;
    quantity: number;
    price: number;
}