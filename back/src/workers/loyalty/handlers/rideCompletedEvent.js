'use strict';

const logger = require('chpr-logger');

const { handleMessageError } = require('../../../lib/workers');
const rideModel = require('../../../models/rides');
const riderModel = require('../../../models/riders');

const { ObjectId } = require('mongodb');

/**
 * Bus message handler for user ride completed events
 *
 * @param   {Object} message The bus message object.
 * @param   {Object} messageFields The bus message metadata.
 * @returns {void}
 */
async function handleRideCompletedEvent(message, messageFields) {
  const { id: rideId, amount, rider_id: riderId } = message.payload;

  logger.info(
		{ rider_id: riderId },
		'[worker.handleRideCompletedEvent] Received user ride completed event',
  );

  try {
	  await rideModel.isValidRideSchema({ _id: rideId, amount, rider_id: riderId });
  } catch (err)
  {
	logger.error(
		{ message, messageFields },
		'[worker.handleRideCompletedEvent] message.payload invalid'
	);
	throw new Error("invalid arguments in message.payload"); 
  }

  var rideIdObj = ObjectId.createFromHexString(rideId);
  var riderIdObj = ObjectId.createFromHexString(riderId);

  var rider_nbr = await riderModel.collection().count({ _id: riderIdObj });
  if (rider_nbr == 0) {
	logger.error(
		{ message, messageFields },
		'[worker.handleRideCompletedEvent] Rider user does not exist'
	);
	throw new Error("no such rider with this ride");
  }
  var ride_nbr = await rideModel.collection().count({ _id: rideIdObj });
  if (ride_nbr >= 1) {
	  logger.error(
		  { message, messageFields },
		  '[worker.handleRideCompletedEvent] Ride id already exists'
	  );
	  throw new Error("duplicate key error in rides collection");
  }

  try {
	  await rideModel.insertOne({
		_id: rideId,
		amount,
		rider_id: riderId,
	  }); 
  } catch (err) {
	handleMessageError(err, message, messageFields);
  }

  try {
    logger.info(
      { rider_id: riderId },
      '[worker.handleRideCompletedEvent] Update rider',
	);
	  await riderModel.updateOneStatus(riderId);
	  await riderModel.updateOneLoyaltyPoints(riderId, amount);
  } catch (err) {
    handleMessageError(err, message, messageFields);
  }
}

module.exports = handleRideCompletedEvent;