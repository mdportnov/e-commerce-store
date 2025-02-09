import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {OrderStatus} from "../../common/dtos/OrderStatus";
import logger from "../../common/utils/logger";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";

const snsClient = new SNSClient({region: process.env.AWS_REGION})
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

function generateOrderId(): string {
    return 'order_' + Math.random().toString(36).slice(2, 9);
}

export const createOrderHandler = async (
    event: APIGatewayProxyEvent,
    context: Context,
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({message: 'Missing request body'})
            }
        }

        const body: OrderRequest = JSON.parse(event.body)

        if (!body.customerId || !Array.isArray(body.items) || body.items.length === 0) {
            logger.error('Invalid request: missing customerId or items', {requestBody: body});
            return {
                statusCode: 400,
                body: JSON.stringify({message: 'Invalid request'})
            }
        }

        const totalAmount = body.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        )

        const order = {
            orderId: generateOrderId(),
            customerId: body.customerId,
            items: body.items,
            totalAmount,
            status: OrderStatus.ORDER_CREATED
        }

        const putParams = {
            TableName: process.env.ORDER_TABLE_NAME!,
            Item: order,
        };

        await docClient.send(new PutCommand(putParams));
        logger.info('Order persisted successfully', { orderId: order.orderId });

        const snsMessage = {
            orderId: order.orderId,
            customerId: order.customerId,
            totalAmount: order.totalAmount,
            paymentMethod: body.paymentMethod,
            items: body.items,
            status: order.status
        }

        const params = {
            Message: JSON.stringify(snsMessage),
            TopicArn: process.env.ORDER_EVENT_TOPIC_ARN!
        }

        await snsClient.send(new PublishCommand(params))

        logger.defaultMeta = {requestId: context.awsRequestId}
        logger.info('Order created successfully', {orderId: order.orderId})

        return {
            statusCode: 201,
            body: JSON.stringify({
                orderId: order.orderId,
                status: order.status,
                totalAmount: order.totalAmount
            })
        }
    } catch (error) {
        logger.error('Error processing order', {error: error instanceof Error ? error.message : error})

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
                status: OrderStatus.ORDER_ERROR
            })
        }
    }
}