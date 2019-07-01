'use strict';

const uuidv1 = require('uuid/v1');
const AWS = require('aws-sdk');

const sqs = new AWS.SQS({ region: process.env.REGION });
const QUEUE_URL = process.env.PENDING_ORDER_QUEUE;
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.hacerPedido = (event, context, callback) => {
  console.log('HacerPedido fue llamada');

  const body = JSON.parse(event.body);
  const orderId = uuidv1();
	const params = {
		MessageBody: JSON.stringify({ orderId, ...body, timestamp: Date.now() }),
		QueueUrl: QUEUE_URL
	};

	sqs.sendMessage(params, function(err, data) {
    console.log(data);
		if (err) {
			sendResponse(500, err, callback);
		} else {
			const message = {
				orderId: orderId,
				messageId: data.MessageId
			};
			sendResponse(200, message, callback);
		}
	});
};

module.exports.prepararPedido = async (event, context, callback) => {
  console.log('prepararPedido is called');

  const params = {
		TableName: process.env.COMPLETED_ORDER_TABLE,
		Item: JSON.parse(event.Records[0].body)
	};
  
   try {
    await dynamo.put(params).promise();

    callback();
   } catch (error) {
    callback(error);
   }  
};

module.exports.pedidoStatus = async (event, context, callback) => {
  const { id } = event.pathParameters;

  const params = {
    TableName : process.env.COMPLETED_ORDER_TABLE,
    Key: {
      orderId: id
    }
  };

  try {
    const { Item } = await dynamo.get(params).promise();

    callback(null, { statusCode: 200, body: JSON.stringify(Item) });
   } catch (error) {
    callback(null, { statusCode: 500, body: JSON.stringify(error) });
   }
};

function sendResponse(statusCode, message, callback) {
	const response = {
		statusCode: statusCode,
		body: JSON.stringify(message)
	};
	callback(null, response);
}