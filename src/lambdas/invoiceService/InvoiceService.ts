import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {SNSEvent} from "aws-lambda";
import {OrderStatus} from "../../common/dtos/OrderStatus";
import logger from "../../common/utils/logger";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

const snsClient = new SNSClient({region: process.env.AWS_REGION});
const ddbClient = new DynamoDBClient({region: process.env.AWS_REGION});
const docClient = DynamoDBDocumentClient.from(ddbClient);

function generateInvoiceId(): string {
    return 'invoice_' + Math.random().toString(36).slice(2, 9);
}

export const invoiceHandler = async (event: SNSEvent): Promise<void> => {
    for (const record of event.Records) {
        try {
            const orderEvent: OrderEvent = JSON.parse(record.Sns.Message)

            const invoice = {
                invoiceId: generateInvoiceId(),
                orderId: orderEvent.orderId,
                customerId: orderEvent.customerId,
                amount: orderEvent.totalAmount,
                createdAt: new Date().toISOString(),
                status: OrderStatus.INVOICE_CREATED
            }

            const putParams = {
                TableName: process.env.INVOICE_TABLE_NAME!, // ensure this env variable is set
                Item: invoice,
            };
            await docClient.send(new PutCommand(putParams));
            logger.info('Invoice persisted successfully', {invoiceId: invoice.invoiceId});

            const params = {
                Message: JSON.stringify(invoice),
                TopicArn: process.env.INVOICE_EVENT_TOPIC_ARN!
            }

            await snsClient.send(new PublishCommand(params))
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            logger.error('Error processing invoice:', {error: errorMessage});

            const errorEvent = {
                error: errorMessage,
                orderId: JSON.parse(record.Sns.Message).orderId,
                status: OrderStatus.INVOICE_ERROR
            }

            await snsClient.send(
                new PublishCommand({
                        Message: JSON.stringify(errorEvent),
                        TopicArn: process.env.ERROR_EVENT_TOPIC_ARN!
                    }
                )
            )
        }
    }
}