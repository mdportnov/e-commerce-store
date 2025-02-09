import {SNSEvent, Context} from 'aws-lambda';
import {SNSClient, PublishCommand} from '@aws-sdk/client-sns';
import logger from '../../common/utils/logger';
import {OrderStatus} from '../../common/dtos/OrderStatus';
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

const snsClient = new SNSClient({region: process.env.AWS_REGION});
const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const billingHandler = async (event: SNSEvent, context: Context): Promise<void> => {
    for (const record of event.Records) {
        try {
            const invoiceEvent: InvoiceEvent = JSON.parse(record.Sns.Message);

            const paymentResult = await processPayment(invoiceEvent);

            logger.info('Payment processed', {
                invoiceId: invoiceEvent.invoiceId,
                orderId: invoiceEvent.orderId,
                result: paymentResult
            });

            const paymentRecord = {
                paymentId: 'payment_' + Math.random().toString(36).slice(2, 9),
                orderId: invoiceEvent.orderId,
                invoiceId: invoiceEvent.invoiceId,
                amount: invoiceEvent.amount,
                paymentStatus: paymentResult.status === 'PAID' ? OrderStatus.PAYMENT_CONFIRMED : OrderStatus.PAYMENT_FAILED,
                processedAt: new Date().toISOString(),
                customerId: invoiceEvent.customerId,
            };

            const putParams = {
                TableName: process.env.PAYMENT_TABLE_NAME!,
                Item: paymentRecord,
            };
            await docClient.send(new PutCommand(putParams));
            logger.info('Payment record persisted successfully', {paymentId: paymentRecord.paymentId});

            if (paymentResult.status === 'PAID') {
                const paymentEvent = {
                    orderId: invoiceEvent.orderId,
                    invoiceId: invoiceEvent.invoiceId,
                    paymentStatus: OrderStatus.PAYMENT_CONFIRMED,
                    paidAt: new Date().toISOString(),
                    customerId: invoiceEvent.customerId,
                };

                const params = {
                    Message: JSON.stringify(paymentEvent),
                    TopicArn: process.env.PAYMENT_EVENT_TOPIC_ARN!,
                };

                await snsClient.send(new PublishCommand(params));
            } else {
                const paymentFailedEvent = {
                    orderId: invoiceEvent.orderId,
                    invoiceId: invoiceEvent.invoiceId,
                    paymentStatus: OrderStatus.PAYMENT_FAILED,
                    failedAt: new Date().toISOString(),
                    customerId: invoiceEvent.customerId,
                };

                await snsClient.send(new PublishCommand({
                    Message: JSON.stringify(paymentFailedEvent),
                    TopicArn: process.env.ERROR_EVENT_TOPIC_ARN!,
                }));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Error processing payment in BillingService', {error: errorMessage});

            const errorEvent = {
                error: errorMessage,
                status: OrderStatus.PAYMENT_FAILED,
                details: 'Error in BillingService',
            };
            await snsClient.send(new PublishCommand({
                Message: JSON.stringify(errorEvent),
                TopicArn: process.env.ERROR_EVENT_TOPIC_ARN!,
            }));
        }
    }
};

async function processPayment(invoiceEvent: InvoiceEvent): Promise<{ status: string }> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {status: 'PAID'};
}