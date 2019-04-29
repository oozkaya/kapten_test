'use strict';

const Joi = require('../../lib/joi');

const signupSchema = Joi.object({
  type: Joi.string().required(),
  payload: Joi.object({
    id: Joi.objectId().required(),
    name: Joi.string()
      .min(6)
      .required(),
  }),
});

const rideCompletedSchema = Joi.object({
  type: Joi.string().required(),
  payload: Joi.object({
    id: Joi.objectId().required(),
    amount: Joi.number().required(),
    rider_id: Joi.objectId().required(),
  }),
});

module.exports = {
  signupSchema,
  rideCompletedSchema,
};
