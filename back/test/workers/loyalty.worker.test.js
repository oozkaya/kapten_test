const { expect } = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const amqplib = require('amqplib');
const { ObjectId } = require('mongodb');
const logger = require('chpr-logger');

const riderModel = require('../../src/models/riders');
const rideModel = require('../../src/models/rides');
const dateLib = require('../../src/lib/date');
const riders = require('../../src/models/riders');
const rides = require('../../src/models/rides');
const {
  start: startWorker,
  stop: stopWorker,
} = require('../../src/workers/loyalty');

const exchangeName = 'events';
let channel;

/**
 * Publish a message on an AMQP queue
 * @param {String} routingKey routing key to publish to
 * @param {Object} payload the message payload
 * @returns {Promise<void>}
 */
async function publish(routingKey, payload) {
  const message = new Buffer(JSON.stringify(payload));
  await channel.publish(exchangeName, routingKey, message);
}

describe('workers/loyalty', () => {
  const amqpUrl = 'amqp://guest:guest@localhost:5672';
  const date = new Date('2018-01-01T12:00:00');
  const sandbox = sinon.sandbox.create();
  let connection;
  let worker;

  before(async () => {
    connection = await amqplib.connect(amqpUrl);
    channel = await connection.createChannel();
    await channel.deleteQueue('loyaltyQueue');
    worker = await startWorker();
    await riders.createIndexes();
    await rides.createIndexes();
  });

  beforeEach(async () => {
    await channel.assertExchange(exchangeName, 'topic');
    await riderModel.collection().remove({});
    await rideModel.collection().remove({});
    sandbox.stub(dateLib, 'getDate').returns(date);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  after(async () => {
    await stopWorker();
    await channel.deleteQueue('loyaltyQueue');
    await channel.deleteExchange(exchangeName);
    await connection.close();
  });

  describe('#handleSignupEvent', () => {
    const message = {
      type: 'rider_signed_up',
      payload: {
        id: '000000000000000000000001',
        name: 'John Doe',
      },
    };

    it('saves rider in db when message is valid', async () => {
      await publish('rider.signup', message);
      await worker.wait(worker.TASK_COMPLETED);


      const riders = await riderModel.find().toArray();
      expect(riders).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          name: 'John Doe',
		  status: 'bronze',
		  loyalty_points: 0,
          created_at: date,
        },
      ]);
    });

    it('does not try to save user if he is already saved in db', async () => {
		const errorSpy = sandbox.spy(logger, 'error');
		await publish('rider.signup', message);
		await worker.wait(worker.TASK_COMPLETED);
		await publish('rider.signup', message);
		await worker.wait(worker.TASK_FAILED);
	  
	  expect(errorSpy.args[0][1]).to.equal(
		'[worker.handleSignupEvent] Rider id already exists',
	  );
    });

    it('tries a second time then drops message if error during rider insertion', async () => {
      const error = new Error('insertion error');
      sandbox.stub(riderModel, 'insertOne').rejects(error);
      const errorSpy = sandbox.spy(logger, 'error');

      await publish('rider.signup', message);
      await worker.wait(worker.TASK_FAILED);

      const riders = await riderModel.find().toArray();
      expect(riders).to.deep.equal([]);
      expect(errorSpy.callCount).to.equal(1);
      expect(errorSpy.args[0][1]).to.equal(
        '[worker.handleMessageError] Could not handle message for the second time, dropping it',
      );
    });

    it('fails validation if no id in message', async () => {
      await publish('rider.signup', _.omit(message.payload, 'id'));
      await worker.wait(worker.TASK_FAILED);

      const riders = await riderModel.find().toArray();
      expect(riders).to.deep.equal([]);
    });

    it('fails validation if id is not a valid ObjectId', async () => {
      await publish('rider.signup', {
        type: message.type,
        payload: { ...message.payload, id: 'not valid' },
      });
      await worker.wait(worker.TASK_FAILED);

      const riders = await riderModel.find().toArray();
      expect(riders).to.deep.equal([]);
    });

    it('fails validation if no name in message', async () => {
      await publish('rider.signup', _.omit(message.payload, 'name'));
      await worker.wait(worker.TASK_FAILED);

      const riders = await riderModel.find().toArray();
      expect(riders).to.deep.equal([]);
    });

	it('fails validation if name no valid string', async () => {
		const errorSpy = sandbox.spy(logger, 'error');
		await publish('rider.signup', {
			type: message.type,
			payload: { ...message.payload, name: 5 },
		});
		await worker.wait(worker.TASK_FAILED);
  
		const riders = await riderModel.find().toArray();
		expect(riders).to.deep.equal([]);
	});

    it('fails validation if name contains less than 6 letters', async () => {
      await publish('rider.signup', {
        type: message.type,
        payload: { ...message.payload, name: 'short' },
      });
      await worker.wait(worker.TASK_FAILED);

      const riders = await riderModel.find().toArray();
      expect(riders).to.deep.equal([]);
    });
  });
  describe('#handleRideCompletedEvent', () => {
	const message = {
		type: 'ride_completed',
		payload: {
			id: '000000000000000000000001',
			amount: 42,
			rider_id: '000000000000000000000001',
		},
	};
	beforeEach(async () => {
		riderModel.insertOne({
			_id: '000000000000000000000001',
			name: 'Test User',
			status: 'bronze',
		});

	});
	afterEach(async () => {
		await riderModel.collection().remove({});
	});

    it('saves the ride in db when message is valid', async () => {
      await publish('ride.completed', message);
      await worker.wait(worker.TASK_COMPLETED);


      const rides = await rideModel.find().toArray();
      expect(rides).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          amount: 42,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001'),
        },
      ]);
    });

    it('does not try to save the ride if it is already saved in db', async () => {
		const errorSpy = sandbox.spy(logger, 'error');
		await publish('ride.completed', message);
		await worker.wait(worker.TASK_COMPLETED);
		await publish('ride.completed', message);
		await worker.wait(worker.TASK_FAILED);
	  
	  expect(errorSpy.args[0][1]).to.equal(
		'[worker.handleRideCompletedEvent] Ride id already exists',
	  );
    });

    it('tries a second time then drops message if error during rider insertion', async () => {
      const error = new Error('insertion error');
      sandbox.stub(rideModel, 'insertOne').rejects(error);
      const errorSpy = sandbox.spy(logger, 'error');

      await publish('ride.completed', message);
      await worker.wait(worker.TASK_FAILED);

      const rides = await rideModel.find().toArray();
      expect(rides).to.deep.equal([]);
      expect(errorSpy.callCount).to.equal(1);
      expect(errorSpy.args[0][1]).to.equal(
        '[worker.handleMessageError] Could not handle message for the second time, dropping it',
      );
    });

    it('fails validation if no id in message', async () => {
      await publish('ride.completed', _.omit(message.payload, 'id'));
      await worker.wait(worker.TASK_FAILED);

      const rides = await rideModel.find().toArray();
      expect(rides).to.deep.equal([]);
    });

    it('fails validation if id is not a valid ObjectId', async () => {
      await publish('ride.completed', {
        type: message.type,
        payload: { ...message.payload, id: 'not valid' },
      });
      await worker.wait(worker.TASK_FAILED);

      const rides = await rideModel.find().toArray();
      expect(rides).to.deep.equal([]);
    });

    it('fails validation if no amount in message', async () => {
      await publish('ride.completed', _.omit(message.payload, 'amount'));
      await worker.wait(worker.TASK_FAILED);

      const rides = await rideModel.find().toArray();
      expect(rides).to.deep.equal([]);
	});

    it('fails validation if negative amount in message', async () => {
		await publish('ride.completed', {
			type: message.type,
			payload: { ...message.payload, amount: -2 },
		  });
		await worker.wait(worker.TASK_FAILED);
  
		const rides = await rideModel.find().toArray();
		expect(rides).to.deep.equal([]);
	});

	it('fails validation on a ride with a non-existing rider', async () => {
		await publish('ride.completed', {
			type: message.type,
			payload: { ...message.payload, rider_id: '000000000000000000000002' },
		});
		const errorSpy = sandbox.spy(logger, 'error');
		await publish('ride.completed', message);
		await worker.wait(worker.TASK_FAILED);
	  
	  expect(errorSpy.args[0][1]).to.equal(
		'[worker.handleRideCompletedEvent] Rider user does not exist',
	  );
	  });
  });
});
