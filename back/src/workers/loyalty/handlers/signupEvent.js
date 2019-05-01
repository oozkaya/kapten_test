'use strict';

const logger = require('chpr-logger');

const { handleMessageError } = require('../../../lib/workers');
const riderModel = require('../../../models/riders');

const { ObjectId } = require('mongodb');
/**
 * Bus message handler for user signup events
 *
 * @param   {Object} message The bus message object.
 * @param   {Object} messageFields The bus message metadata.
 * @returns {void}
 */
async function handleSignupEvent(message, messageFields) {
  const { id: riderId, name } = message.payload;

  logger.info(
    { rider_id: riderId, name },
    '[worker.handleSignupEvent] Received user signup event',
  );

  var riderIdObj = ObjectId.createFromHexString(riderId);
  var rider_nbr = await riderModel.collection().count({ _id: riderIdObj });
  if (rider_nbr >= 1) {
	  logger.error(
		  { message, messageFields },
		  '[worker.handleSignupEvent] Rider id already exists'
	  );
	  throw new Error("duplicate key error in riders collection");
  }

  try {
    logger.info(
      { rider_id: riderId, name },
      '[worker.handleSignupEvent] Insert rider',
    );
    await riderModel.insertOne({
      _id: riderId,
      name,
    });
  } catch (err) {
    handleMessageError(err, message, messageFields);
  }
}

module.exports = handleSignupEvent;
