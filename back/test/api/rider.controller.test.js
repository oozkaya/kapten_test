'use strict';

const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');

const { start, stop } = require('../../src/app');
const riders = require('../../src/models/riders');
const rides = require('../../src/models/rides');

describe('api/rider', () => {
  const sandbox = sinon.sandbox.create();
  const riderId = '000000000000000000000001';
  const rideId = '000000000000000000000010';

  let app;
  before(async () => {
    app = await start();
  });

  after(async () => {
    await stop();
  });

  beforeEach(async () => {
    await riders.collection().remove({});
    await rides.collection().remove({});
  });

  afterEach(() => sandbox.restore());

  describe('GET /loyalty/:rider_id', () => {
    it('returns 400 if rider id is invalid', async () => {
      const { body, status } = await request(app).get(
        '/api/rider/loyalty/invalid_id',
      );

      expect({ body, status }).to.deep.equal({ body: {}, status: 400 });
    });

    it('returns 404 if rider is not found', async () => {
      const { body, status } = await request(app).get(
        `/api/rider/loyalty/${riderId}`,
      );

      expect({ body, status }).to.deep.equal({ body: {}, status: 404 });
    });

    it('returns rider status and loyalty points', async () => {
      await riders.insertOne({
        _id: riderId,
        name: 'Test user',
        status: 'silver',
      });

      const { body, status } = await request(app).get(
        `/api/rider/loyalty/${riderId}`,
      );

      expect({ body, status }).to.deep.equal({
        status: 200,
        body: {
          _id: riderId,
		  name: 'Test user',
		  loyalty_points: 0,
          status: 'silver',
        },
      });
    });
  });

  describe('GET /nbr_rides/:rider_id', () => {
    it('returns 400 if rider id is invalid', async () => {
      const { body, status } = await request(app).get(
        '/api/rider/nbr_rides/invalid_id',
      );

      expect({ body, status }).to.deep.equal({ body: {}, status: 400 });
    });

    it('returns 404 if rider is not found', async () => {
      const { body, status } = await request(app).get(
        `/api/rider/nbr_rides/${riderId}`,
      );

      expect({ body, status }).to.deep.equal({ body: {}, status: 404 });
    });

    it('returns rider number of rides', async () => {
	  await riders.insertOne({
		_id: riderId,
		name: 'Test user',
		status: 'silver',
	  });
      await rides.insertOne({
        _id: rideId,
        amount: 42,
        rider_id: riderId,
	  });

      const { body, status } = await request(app).get(
        `/api/rider/nbr_rides/${riderId}`,
      );

      expect({ body, status }).to.deep.equal({
        status: 200,
        body: {
			nbr_ride: 1,
		}
      });
    });
  });
});
