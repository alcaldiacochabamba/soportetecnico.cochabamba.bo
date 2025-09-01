// Importa el servicio 'auth' desde la carpeta 'service'
const authService = require("../service/auth.service");
// Importa una utilidad para responder en formato JSON
const jsonResponse = require("../http/response/jsonResponse");
// Importa Joi para validación de errores
const Joi = require("joi");
// Importa DTOs
const ForgotPasswordDTO = require("../http/request/user/forgotPasswordDTO");
const ResetPasswordDTO = require("../http/request/user/resetPasswordDTO");

class AuthController {
    /**
     * Maneja "olvidaste tu contraseña"
     */
    static async forgotPassword(req, res) {
         console.log("📩 Entrando a forgotPassword con body:", req.body);
        try {
            // Validar con Joi usando el DTO
            const { error } = ForgotPasswordDTO.validate(req.body);
            if (error) {
                return jsonResponse.validationResponse(
                    res,
                    400,
                    "Validation error",
                    error.details.map(err => err.message)
                );
            }

            const { email } = req.body;

            // Llamamos al servicio
            await authService.forgotPassword(email);

            return jsonResponse.successResponse(
                res,
                200,
                "Correo de recuperación enviado"
            );
        } catch (error) {
            return Joi.isError(error)
                ? jsonResponse.validationResponse(
                      res,
                      409,
                      "Validation error",
                      error.details.map(err => err.message)
                  )
                : jsonResponse.errorResponse(res, 500, error.message);
        }
    }

    /**
     * Maneja "reset password"
     */
    static async resetPassword(req, res) {
        try {
            // Validar con Joi usando el DTO
            const { error } = ResetPasswordDTO.validate(req.body);
            if (error) {
                return jsonResponse.validationResponse(
                    res,
                    400,
                    "Validation error",
                    error.details.map(err => err.message)
                );
            }

            const { token, newPassword } = req.body;

            // Llamamos al servicio
            await authService.resetPassword(token, newPassword);

            return jsonResponse.successResponse(
                res,
                200,
                "Contraseña actualizada correctamente"
            );
        } catch (error) {
            return Joi.isError(error)
                ? jsonResponse.validationResponse(
                      res,
                      409,
                      "Validation error",
                      error.details.map(err => err.message)
                  )
                : jsonResponse.errorResponse(res, 500, error.message);
        }
    }
}

// Exporta la clase AuthController
module.exports = AuthController;
