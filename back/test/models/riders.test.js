'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');

const dateLib = require('../../src/lib/date');
const mongodb = require('../../src/lib/mongodb');
const riders = require('../../src/models/riders');
const rides = require('../../src/models/rides');

describe('models/riders', () => {
  const sandbox = sinon.sandbox.create();
  const date = new Date('2018-01-01T12:00:00');

  before(async () => {
    await mongodb.connect();
    await riders.createIndexes();
    await rides.createIndexes();
  });

  beforeEach(async () => {
    await riders.collection().remove({});
    await rides.collection().remove({});
    sandbox.stub(dateLib, 'getDate').returns(date);
  });

  afterEach(() => sandbox.restore());

  after(async () => {
    await mongodb.disconnect();
  });

  describe('#insertOne', () => {
    it('inserts a new rider record into the database', async () => {
      const rider = await riders.insertOne({
        _id: '000000000000000000000001',
        name: 'Test User',
        status: 'bronze',
      });

      expect(rider).to.deep.equal({
        _id: ObjectId.createFromHexString('000000000000000000000001'),
        name: 'Test User',
		status: 'bronze',
		loyalty_points: 0,
        created_at: date,
      });

      const dbRiders = await riders
        .collection()
        .find()
        .toArray();
      expect(dbRiders).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          name: 'Test User',
		  status: 'bronze',
		  loyalty_points: 0,
          created_at: date,
        },
      ]);
    });

    it('does not insert a document failing validation', async () => {
      let error;

      try {
        await riders.insertOne({
          _id: '000000000000000000000001',
          name: 'short',
        });
      } catch (err) {
        error = err;
      }

      expect(error)
        .to.be.an('Error')
        .with.property('message')
        .that.matches(/"name" length must be at least 6 characters long/);
    });
  });

  describe('#updateOne', () => {
    it('updates nothing if rider does not exists', async () => {
      const rider = await riders.updateOne(
        ObjectId.createFromHexString('000000000000000000000001'),
        {
          status: 'bronze',
        },
      );

      expect(rider.result.nModified).to.equal(0);
      const dbRiders = await riders
        .collection()
        .find()
        .toArray();
      expect(dbRiders).to.deep.equal([]);
    });

    it('updates the model accordingly', async () => {
      await riders.insertOne({
        _id: '000000000000000000000001',
        name: 'Test User',
        status: 'bronze',
      });

      const riderUpdated = await riders.updateOne(
        ObjectId.createFromHexString('000000000000000000000001'),
        {
          status: 'platinum',
        },
      );

      expect(riderUpdated.result.nModified).to.equal(1);

      const dbRiders = await riders
        .collection()
        .find()
        .toArray();
      expect(dbRiders).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          name: 'Test User',
		  status: 'platinum',
		  loyalty_points: 0,
          created_at: date,
        },
      ]);
    });
  });

  describe('#find', () => {
    beforeEach(async () => {
      await riders.collection().insertMany([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          name: 'Test User',
		  status: 'bronze',
		  loyalty_points: 0,
          created_at: date,
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000002'),
          name: 'Silver User',
          status: 'silver',
		  loyalty_points: 0,
          created_at: date,
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000003'),
          name: 'Gold User',
          status: 'gold',
		  loyalty_points: 0,
          created_at: date,
        },
      ]);
    });

    it('finds all riders', async () => {
      const results = await riders.find().toArray();
      expect(results).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          name: 'Test User',
		  status: 'bronze',
		  loyalty_points: 0,
          created_at: date,
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000002'),
          name: 'Silver User',
		  status: 'silver',
		  loyalty_points: 0,
          created_at: date,
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000003'),
          name: 'Gold User',
		  status: 'gold',
		  loyalty_points: 0,
          created_at: date,
        },
      ]);
    });

    it('finds all riders matching a query', async () => {
      const results = await riders.find({ status: 'bronze' }).toArray();
      expect(results).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          name: 'Test User',
		  status: 'bronze',
		  loyalty_points: 0,
          created_at: date,
        },
      ]);
    });

    it('applies the projection', async () => {
      const results = await riders.find({}, { status: 1 }).toArray();
      expect(results).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          status: 'bronze',
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000002'),
          status: 'silver',
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000003'),
          status: 'gold',
        },
      ]);
    });
  });

  describe('#findOneById', () => {
    beforeEach(async () => {
      await riders.insertOne({
        _id: '000000000000000000000001',
        name: 'Test User',
        status: 'bronze',
		loyalty_points: 0,
        created_at: date,
      });
    });

    it('finds a rider by id', async () => {
      const results = await riders.findOneById(
        ObjectId.createFromHexString('000000000000000000000001'),
      );

      expect(results).to.deep.equal({
        _id: ObjectId.createFromHexString('000000000000000000000001'),
        name: 'Test User',
		status: 'bronze',
		loyalty_points: 0,
        created_at: date,
      });
    });

    it('applies the projections', async () => {
      const results = await riders.findOneById(
        ObjectId.createFromHexString('000000000000000000000001'),
        { name: 1 },
      );

      expect(results).to.deep.equal({
        _id: ObjectId.createFromHexString('000000000000000000000001'),
        name: 'Test User',
      });
    });
  });
  describe('#updateOneStatus', () => {
    beforeEach(async () => {
		const ride_id = [
			ObjectId.createFromHexString('000000000000000000000001'),
			ObjectId.createFromHexString('000000000000000000000002'),
			ObjectId.createFromHexString('000000000000000000000003'),
			ObjectId.createFromHexString('000000000000000000000004'),
			ObjectId.createFromHexString('000000000000000000000005'),
			ObjectId.createFromHexString('000000000000000000000006'),
			ObjectId.createFromHexString('000000000000000000000007'),
			ObjectId.createFromHexString('000000000000000000000008'),
			ObjectId.createFromHexString('000000000000000000000009'),
			ObjectId.createFromHexString('000000000000000000000010'),
			ObjectId.createFromHexString('000000000000000000000011'),
			ObjectId.createFromHexString('000000000000000000000012'),
			ObjectId.createFromHexString('000000000000000000000013'),
			ObjectId.createFromHexString('000000000000000000000014'),
			ObjectId.createFromHexString('000000000000000000000015'),
			ObjectId.createFromHexString('000000000000000000000016'),
			ObjectId.createFromHexString('000000000000000000000017'),
			ObjectId.createFromHexString('000000000000000000000018'),
			ObjectId.createFromHexString('000000000000000000000019'),
			ObjectId.createFromHexString('000000000000000000000020'),
		];
		for (let i = 0; i < ride_id.length; i++) {
			await rides.collection().insertOne({
				_id: ride_id[i],
				amount: 42,
				rider_id: ObjectId.createFromHexString('000000000000000000000001'),
			  });
		}
    });

    it('updates rider status according to number of rides', async () => {
		  await riders.insertOne({
			_id: '000000000000000000000001',
			name: 'Test User',
			status: 'bronze',
		  });
		  const riderUpdated = await riders.updateOneStatus('000000000000000000000001');
	
		  expect(riderUpdated.result.nModified).to.equal(1);
	
		  const dbRiders = await riders
			.collection()
			.find()
			.toArray();
		  expect(dbRiders).to.deep.equal([
			{
			  _id: ObjectId.createFromHexString('000000000000000000000001'),
			  name: 'Test User',
			  status: 'silver',
			  loyalty_points: 0,
			  created_at: date,
			},
		  ])
    });
  })
  describe('#updateOneStatus', () => {
    beforeEach(async () => {
		const ride_id = [
			ObjectId.createFromHexString('000000000000000000000001'),
			ObjectId.createFromHexString('000000000000000000000002'),
			ObjectId.createFromHexString('000000000000000000000003'),
			ObjectId.createFromHexString('000000000000000000000004'),
			ObjectId.createFromHexString('000000000000000000000005'),
			ObjectId.createFromHexString('000000000000000000000006'),
			ObjectId.createFromHexString('000000000000000000000007'),
			ObjectId.createFromHexString('000000000000000000000008'),
			ObjectId.createFromHexString('000000000000000000000009'),
			ObjectId.createFromHexString('000000000000000000000010'),
			ObjectId.createFromHexString('000000000000000000000011'),
			ObjectId.createFromHexString('000000000000000000000012'),
			ObjectId.createFromHexString('000000000000000000000013'),
			ObjectId.createFromHexString('000000000000000000000014'),
			ObjectId.createFromHexString('000000000000000000000015'),
			ObjectId.createFromHexString('000000000000000000000016'),
			ObjectId.createFromHexString('000000000000000000000017'),
			ObjectId.createFromHexString('000000000000000000000018'),
			ObjectId.createFromHexString('000000000000000000000019'),
			ObjectId.createFromHexString('000000000000000000000020'),
		];
		for (let i = 0; i < ride_id.length; i++) {
			await rides.collection().insertOne({
				_id: ride_id[i],
				amount: 1,
				rider_id: ObjectId.createFromHexString('000000000000000000000001'),
			  });
		}
    });
    it('updates rider loyalty points according to status', async () => {
		  await riders.insertOne({
			_id: '000000000000000000000001',
			name: 'Test User',
			status: 'bronze',
		  });
		  const riderUpdated = await riders.updateOneLoyaltyPoints('000000000000000000000001', 20);
	
		  expect(riderUpdated.result.nModified).to.equal(1);
	
		  const dbRiders = await riders
			.collection()
			.find()
			.toArray();
		  expect(dbRiders).to.deep.equal([
			{
			  _id: ObjectId.createFromHexString('000000000000000000000001'),
			  name: 'Test User',
			  status: 'bronze',
			  loyalty_points: 20,
			  created_at: date,
			},
		  ])
    });
  })
});
