'use strict';

const HttpStatus = require('http-status-codes');
const logger = require('chpr-logger');

const Joi = require('../../lib/joi');
const riders = require('../../models/riders');
const rides = require('../../models/rides');

const { getLoyaltyInfoSchema } = require('./schemas');

/**
 * Get current rider status
 *
 * @param {Object} req express request
 * @param {Object} res express response
 *
 * @returns {Object} response
 */
async function getLoyaltyInfo(req, res) {
  const { error, value: validatedParams } = Joi.validate(
    req.params,
    getLoyaltyInfoSchema,
  );

  if (error) {
    logger.error({ error }, '[loyalty#getLoyaltyInfo] Error: invalid body');
    return res.sendStatus(HttpStatus.BAD_REQUEST);
  }

  const { rider_id: riderId } = validatedParams;
  logger.info(
    { rider_id: riderId },
    '[loyalty#getLoyaltyInfo] Rider info requested',
  );

  const rider = await riders.findOneById(riderId, { name: 1, status: 1 , loyalty_points: 1});
  if (!rider) {
    logger.info(
      { rider_id: riderId },
      '[loyalty#getLoyaltyInfo] User does not exist',
    );
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  return res.send(rider);
}

/**
 * Get current rider's number of rides
 *
 * @param {Object} req express request
 * @param {Object} res express response
 *
 * @returns {Object} response
 */

async function getNumberOfRides(req, res) {
	const { error, value: validatedParams } = Joi.validate(
	  req.params,
	  getLoyaltyInfoSchema,
	);
  
	if (error) {
	  logger.error({ error }, '[loyalty#getNumberOfRides] Error: invalid body');
	  return res.sendStatus(HttpStatus.BAD_REQUEST);
	}
  
	const { rider_id: riderId } = validatedParams;
	logger.info(
	  { rider_id: riderId },
	  '[loyalty#getNumberOfRides] Rider info requested',
	);
 
	try {
		const rider = await rides.collection().count({ rider_id: riderId });
		var body = { nbr_ride: rider};

		if (!rider) {
			logger.info(
				{ rider_id: riderId },
				'[loyalty#getNumberOfRides] User does not exist',
			);
			return res.sendStatus(HttpStatus.NOT_FOUND);
		}
	} catch (err){
		logger.error( { err }, '[loyalty#getNumberOfRides] Error occured in query' );
		throw err;
	}
  
	return res.send(body);
  }

module.exports = {
  getLoyaltyInfo,
  getNumberOfRides,
};
