'use strict';

const logger = require('chpr-logger');

const { handleMessageError } = require('../../../lib/workers');
const rideModel = require('../../../models/rides');

/**
 * Bus message handler for user ride completed events
 *
 * @param   {Object} message The bus message object.
 * @param   {Object} messageFields The bus message metadata.
 * @returns {void}
 */
async function handleRideCompletedEvent(message, messageFields) {
  print("TEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEST");
  const { id: rideId, amount, rider_id: riderId } = message.payload;
  const ride = { rideId, amount, riderId };
  await rideModel.insertOne(ride);
  await riderModel.updateOneStatus(riderId);
  await riderModel.updateOneLoyaltyPoints(riderId, amount);

  logger.info(
    { rider_id: riderId },
    '[worker.handleRideCompletedEvent] Received user ride completed event',
  );

  // TODO handle idempotency

  try {
    logger.info(
      { rider_id: riderId },
      '[worker.handleRideCompletedEvent] Update rider',
	);
	
	await riderModel.updateOne(
		riderId,
		{ status: updatedStatus, ride_completed: rideCompleted }
	);
  } catch (err) {
    handleMessageError(err, message, messageFields);
  }
}

module.exports = handleRideCompletedEvent;