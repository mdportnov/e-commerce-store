interface EmailLog {
    emailLogId: string;
    orderId?: string;
    customerId: string;
    subject: string;
    body: string;
    sentAt: string;
    status: string; // e.g., "SENT" or "FAILED"
}