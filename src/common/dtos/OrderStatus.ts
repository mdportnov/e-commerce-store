export enum OrderStatus {
    // Order service statuses
    ORDER_CREATED = 'ORDER_CREATED',
    ORDER_ERROR = 'ORDER_ERROR',

    // Invoice service statuses
    INVOICE_CREATED = 'INVOICE_CREATED',
    INVOICE_ERROR = 'INVOICE_ERROR',

    // Billing service statuses
    PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
    PAYMENT_FAILED = 'PAYMENT_FAILED',

    // Shipment service statuses
    SHIPPED = 'SHIPPED',
    SHIPMENT_ERROR = 'SHIPMENT_ERROR'
}