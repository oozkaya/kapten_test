'use strict';

const logger = require('chpr-logger');

const { handleMessageError } = require('../../../lib/workers');
const riderModel = require('../../../models/riders');

/**
 * Bus message handler for user ride completed events
 *
 * @param   {Object} message The bus message object.
 * @param   {Object} messageFields The bus message metadata.
 * @returns {void}
 */
async function handleRideCompletedEvent(message, messageFields) {
  const { rider_id: riderId, amount } = message.payload;
  var rider = riderModel.findOneById(riderId);
  rider.
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