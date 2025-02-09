import {SNSEvent, Context} from 'aws-lambda';
import {SNSClient, PublishCommand} from '@aws-sdk/client-sns';
import logger from '../../common/utils/logger';
import {OrderStatus} from '../../common/dtos/OrderStatus';
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";

const snsClient = new SNSClient({region: process.env.AWS_REGION});
const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const shipmentHandler = async (event: SNSEvent, context: Context): Promise<void> => {
    for (const record of event.Records) {
        try {
            const paymentEvent: PaymentEvent = JSON.parse(record.Sns.Message);

            if (paymentEvent.paymentStatus !== OrderStatus.PAYMENT_CONFIRMED) {
                logger.error('Payment not confirmed, skipping shipment', {orderId: paymentEvent.orderId});
                continue;
            }

            const shipment = {
                shipmentId: generateShipmentId(),
                orderId: paymentEvent.orderId,
                trackingNumber: 'TRACK' + Math.floor(Math.random() * 1000000),
                status: OrderStatus.SHIPPED,
                shippedAt: new Date().toISOString(),
                customerId: paymentEvent.customerId,
            };

            const putParams = {
                TableName: process.env.SHIPMENT_TABLE_NAME!,
                Item: shipment,
            };
            await docClient.send(new PutCommand(putParams));

            logger.info('Shipment created successfully', {shipmentId: shipment.shipmentId, orderId: shipment.orderId});

            const params = {
                Message: JSON.stringify(shipment),
                TopicArn: process.env.SHIPMENT_EVENT_TOPIC_ARN!,
            };

            await snsClient.send(new PublishCommand(params));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Error processing shipment in ShipmentService', {error: errorMessage});
            const errorEvent = {
                error: errorMessage,
                status: OrderStatus.SHIPMENT_ERROR,
                details: 'Error in ShipmentService',
            };
            await snsClient.send(new PublishCommand({
                Message: JSON.stringify(errorEvent),
                TopicArn: process.env.ERROR_EVENT_TOPIC_ARN!,
            }));
        }
    }
};

function generateShipmentId(): string {
    return 'shipment_' + Math.random().toString(36).slice(2, 9);
}