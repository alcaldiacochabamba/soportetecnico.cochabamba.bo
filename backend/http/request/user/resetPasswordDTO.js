// resetPasswordDTO.js
const Joi = require("joi");

const ResetPasswordDTO = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'El token es requerido'
    }),

  newPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'any.required': 'La nueva contraseña es requerida'
    })
});

module.exports = ResetPasswordDTO;
