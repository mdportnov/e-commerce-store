import express, {Request, Response} from 'express';
import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {createOrderHandler} from "../lambdas/orderService/OrderService";

const router = express.Router();

const dummyContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'local-order-service',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:local:123456789012:function:local-order-service',
    memoryLimitInMB: '128',
    awsRequestId: 'local-request-id',
    logGroupName: 'local-log-group',
    logStreamName: 'local-log-stream',
    getRemainingTimeInMillis: () => 10000,
    done: () => {
    },
    fail: () => {
    },
    succeed: () => {
    },
};

router.post('/', async (req: Request, res: Response) => {
    const event: APIGatewayProxyEvent = {
        body: JSON.stringify(req.body),
        headers: req.headers as { [name: string]: string },
        httpMethod: req.method,
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        path: req.path,
        pathParameters: null,
        queryStringParameters: req.query as { [name: string]: string },
        requestContext: {} as any,
        resource: '',
        stageVariables: {
            environment: 'development'
        }
    };

    try {
        const result: APIGatewayProxyResult = await createOrderHandler(event, dummyContext);
        res.status(result.statusCode).json(JSON.parse(result.body));
    } catch (err: any) {
        res.status(500).json({message: 'Error processing order', error: err.message});
    }
});

export default router;