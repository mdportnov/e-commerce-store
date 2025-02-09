import ordersRouter from './orders';
import express from "express";

const app = express();

app.use(express.json());

app.use('/orders', ordersRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});