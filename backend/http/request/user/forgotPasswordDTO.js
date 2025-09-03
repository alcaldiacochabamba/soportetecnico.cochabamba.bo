// forgotPasswordDTO.js
const Joi = require("joi");

const ForgotPasswordDTO = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El correo electrónico debe ser válido',
      'any.required': 'El correo electrónico es requerido'
    })
});

module.exports = ForgotPasswordDTO;
