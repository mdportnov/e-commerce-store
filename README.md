# System Design Overview

Architecture Components

- API Gateway: Exposes a REST endpoint (POST /orders) for order creation
- Order Service (Lambda): Validates input, calculates the total, and creates an order record
- SNS Topic (OrderEvents): Publishes order events to trigger subsequent processes
- Invoice Service (Lambda): Subscribed to the SNS topic; generates an invoice upon receiving an order-created event
- Billing Service (Lambda): Listens for invoice events and processes the payment via a 3rd-party provider
- Shipment Service (Lambda): Triggered after payment confirmation to arrange shipment and retrieve a tracking number
- Email Service (Lambda): Subscribes to various events to send customer notifications (order received, invoice issued,
  payment processed, shipment dispatched, etc.)

              +--------------+
              |   Customer   |
              +------+-------+
                     |
                     v
             +---------------+
             |  API Gateway  |  (POST /orders)
             +-------+-------+
                     |
                     v
           +-------------------+
           |   Order Service   |  (Lambda)
           | - Validate order  |
           | - Calculate total |
           | - Persist order   |
           +--------+----------+
                    |
                    v
           +-------------------+
           |     SNS Topic     | (OrderEvents)
           +--------+----------+
                    |                  
       +------------------+---------------+----------------+
       |                  |               |                |
       v                  v               v                v
      +--------------+ +--------------+ +--------------+ +--------------+
      |   Invoice    | |   Billing    | |   Shipment   | |   Email      |
      |   Service    | |   Service    | |   Service    | |   Service    |
      |  (Lambda)    | |   (Lambda)   | |   (Lambda)   | |   (Lambda)   |
      +--------------+ +--------------+ +--------------+ +--------------+

## Overview

The system is built as an event-driven microservices architecture using AWS Lambda and SNS. It decouples
responsibilities into several services:

Order Service: Exposes a REST API via API Gateway that accepts order requests. It validates input, calculates totals,
creates an order, and publishes an event (status: ORDER_CREATED) to an SNS topic.

- Invoice Service: Triggered by the order event, it generates an invoice and publishes an invoice event (status:
  INVOICE_CREATED).
- Billing Service: Listens for invoice events and simulates payment processing. On success, it publishes a payment
  event (status: PAYMENT_CONFIRMED); on failure, it publishes an error event (status: PAYMENT_FAILED).
- Shipment Service: Receives payment events. If the payment is confirmed, it simulates shipment creation (generating a
  tracking number) and publishes a shipment event (status: SHIPPED). If shipment fails, it publishes an error event (
  status: SHIPMENT_ERROR).
- Email Service: Listens for various events (order, invoice, payment, shipment, or error events) and sends email
  notifications to the customer at each stage or in case of errors.