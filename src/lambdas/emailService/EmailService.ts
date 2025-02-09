import {SNSEvent, Context} from 'aws-lambda';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, PutCommand} from '@aws-sdk/lib-dynamodb';
import logger from '../../common/utils/logger';
import {OrderStatus} from '../../common/dtos/OrderStatus';

const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION});
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface EmailLog {
    emailLogId: string;
    orderId?: string;
    customerId: string;
    subject: string;
    body: string;
    sentAt: string;
    status: string; // e.g., "SENT" or "FAILED"
}

export const emailHandler = async (event: SNSEvent, context: Context): Promise<void> => {
    for (const record of event.Records) {
        try {
            const message = JSON.parse(record.Sns.Message);
            let subject: string;
            let emailBody: string;
            let orderId: string | undefined;
            let customerId: string;

            if (message.status === OrderStatus.ORDER_CREATED) {
                subject = 'Order Received';
                emailBody = `Your order ${message.orderId} has been received.`;
                orderId = message.orderId;
                customerId = message.customerId;
            } else if (message.status === OrderStatus.INVOICE_CREATED) {
                subject = 'Invoice Issued';
                emailBody = `Invoice ${message.invoiceId} for your order ${message.orderId} has been issued.`;
                orderId = message.orderId;
                customerId = message.customerId;
            } else if (message.paymentStatus === OrderStatus.PAYMENT_CONFIRMED) {
                subject = 'Payment Confirmed';
                emailBody = `Payment for your order ${message.orderId} has been confirmed.`;
                orderId = message.orderId;
                customerId = message.customerId;
            } else if (message.status === OrderStatus.SHIPPED) {
                subject = 'Shipment Dispatched';
                emailBody = `Your order ${message.orderId} has been shipped. Tracking number: ${message.trackingNumber}`;
                orderId = message.orderId;
                customerId = message.customerId;
            } else if (
                message.status === OrderStatus.ORDER_ERROR ||
                message.status === OrderStatus.INVOICE_ERROR ||
                message.status === OrderStatus.PAYMENT_FAILED ||
                message.status === OrderStatus.SHIPMENT_ERROR
            ) {
                subject = 'Order Issue';
                emailBody = `There was an issue with your order ${message.orderId}. Please contact support. Error details: ${message.error || message.details}`;
                orderId = message.orderId;
                customerId = message.customerId;
            } else {
                logger.warn('Unknown event type received in EmailService', {event: message});
                continue;
            }

            logger.info(`Sending email to ${customerId}: ${subject}`);

            const emailLog: EmailLog = {
                emailLogId: 'emaillog_' + Math.random().toString(36).slice(2, 9),
                orderId,
                customerId,
                subject,
                body: emailBody,
                sentAt: new Date().toISOString(),
                status: 'SENT'
            };

            const putParams = {
                TableName: process.env.EMAIL_LOG_TABLE_NAME!,
                Item: emailLog,
            };
            await docClient.send(new PutCommand(putParams));
            logger.info('Email log persisted successfully', {emailLogId: emailLog.emailLogId});

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Error processing email event', {error: errorMessage});
        }
    }
};