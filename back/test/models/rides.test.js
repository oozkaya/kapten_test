'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');

const dateLib = require('../../src/lib/date');
const mongodb = require('../../src/lib/mongodb');
const rides = require('../../src/models/rides');

describe('models/rides', () => {
  const sandbox = sinon.sandbox.create();
  const date = new Date('2018-01-01T12:00:00');

  before(async () => {
    await mongodb.connect();
    await rides.createIndexes();
  });

  beforeEach(async () => {
    await rides.collection().remove({});
    sandbox.stub(dateLib, 'getDate').returns(date);
  });

  afterEach(() => sandbox.restore());

  after(async () => {
    await mongodb.disconnect();
  });

  describe('#insertOne', () => {
    it('inserts a new ride record into the database', async () => {
      const ride = await rides.insertOne({
        _id: '000000000000000000000001',
        amount: 42,
        rider_id: '000000000000000000000001',
      });

      expect(ride).to.deep.equal({
        _id: ObjectId.createFromHexString('000000000000000000000001'),
        amount: 42,
        rider_id: ObjectId.createFromHexString('000000000000000000000001'),
      });

      const dbRides = await rides
        .collection()
        .find()
        .toArray();
      expect(dbRides).to.deep.equal([
        {
			_id: ObjectId.createFromHexString('000000000000000000000001'),
			amount: 42,
			rider_id: ObjectId.createFromHexString('000000000000000000000001'),
        },
      ]);
    });

    it('does not insert a document failing validation', async () => {
      let error;

      try {
        await rides.insertOne({
          _id: '000000000000000000000001',
		  amount: -2,
          rider_id: '000000000000000000000001',
        });
      } catch (err) {
        error = err;
      }

      expect(error)
        .to.be.an('Error')
        .with.property('message')
        .that.matches(/"amount" must be larger than or equal to 0/);
    });
  });

  describe('#updateOne', () => {
    it('updates nothing if the ride does not exists', async () => {
      const ride = await rides.updateOne(
        ObjectId.createFromHexString('000000000000000000000001'),
        {
          amount: 21,
        },
      );

      expect(ride.result.nModified).to.equal(0);
      const dbRides = await rides
        .collection()
        .find()
        .toArray();
      expect(dbRides).to.deep.equal([]);
    });

    it('updates the model accordingly', async () => {
      await rides.insertOne({
        _id: '000000000000000000000001',
        amount: 42,
        rider_id: '000000000000000000000001',
      });

      const rideUpdated = await rides.updateOne(
        ObjectId.createFromHexString('000000000000000000000001'),
        {
		  amount: 21,
        },
      );

      expect(rideUpdated.result.nModified).to.equal(1);

      const dbRides = await rides
        .collection()
        .find()
        .toArray();
      expect(dbRides).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          amount: 21,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001'),
        },
      ]);
    });
  });

  describe('#find', () => {
    beforeEach(async () => {
      await rides.collection().insertMany([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          amount: 42,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001'),
        },
        {
		  _id: ObjectId.createFromHexString('000000000000000000000002'),
		  amount: 10,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001')
        },
        {
		  _id: ObjectId.createFromHexString('000000000000000000000003'),
		  amount: 1,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001')
        },
      ]);
    });

    it('finds all riders', async () => {
      const results = await rides.find().toArray();
      expect(results).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          amount: 42,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001'),
        },
        {
		  _id: ObjectId.createFromHexString('000000000000000000000002'),
		  amount: 10,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001')
        },
        {
		  _id: ObjectId.createFromHexString('000000000000000000000003'),
		  amount: 1,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001')
        },
      ]);
    });

    it('finds all riders matching a query', async () => {
      const results = await rides.find({ amount: 42 }).toArray();
      expect(results).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          amount: 42,
		  rider_id: ObjectId.createFromHexString('000000000000000000000001'),
        },
      ]);
    });

    it('applies the projection', async () => {
      const results = await rides.find({}, { amount: 1 }).toArray();
      expect(results).to.deep.equal([
        {
          _id: ObjectId.createFromHexString('000000000000000000000001'),
          amount: 42,
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000002'),
          amount: 10,
        },
        {
          _id: ObjectId.createFromHexString('000000000000000000000003'),
          amount: 1,
        },
      ]);
    });
  });

  describe('#findOneById', () => {
    beforeEach(async () => {
      await rides.insertOne({
        _id: '000000000000000000000001',
		amount: 42,
        rider_id: '000000000000000000000001',
      });
    });

    it('finds a rider by id', async () => {
      const results = await rides.findOneById(
        ObjectId.createFromHexString('000000000000000000000001'),
      );

      expect(results).to.deep.equal({
        _id: ObjectId.createFromHexString('000000000000000000000001'),
        amount: 42,
        rider_id: ObjectId.createFromHexString('000000000000000000000001'),
      });
    });

    it('applies the projections', async () => {
      const results = await rides.findOneById(
        ObjectId.createFromHexString('000000000000000000000001'),
        { amount: 1 },
      );

      expect(results).to.deep.equal({
        _id: ObjectId.createFromHexString('000000000000000000000001'),
        amount: 42,
      });
    });
  });
});
