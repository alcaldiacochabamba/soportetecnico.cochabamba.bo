// service/auth.service.js
const db = require("../models");
const User = db.User;  // ✅ así garantizamos que el modelo esté inicializado

console.log("¿User es válido?", !!User);
console.log("Métodos disponibles en User:", Object.keys(User));

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const transporter = require("../config/email");

class AuthService {
  static async findUserByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  static async updatePassword(userId, hashedPassword) {
    // OJO: en la base se llama usuarios_id
    return await User.update(
      { password: hashedPassword },
      { where: { usuarios_id: userId } }
    );
  }

  static async forgotPassword(email) {
    try {
      console.log(" Forgot password solicitado para:", email);

      const user = await this.findUserByEmail(email);
      if (!user) {
        console.log(" Usuario no encontrado:", email);
        throw new Error("El correo no está registrado");
      }

      console.log("Usuario encontrado:", user.email);

      // 🔑 Generamos un JWT temporal (15 minutos de vida)
      const token = jwt.sign(
        { userId: user.usuarios_id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      console.log(" Reset link generado:", resetLink);

      // Enviar correo
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Restablece tu contraseña",
        html: `
          <p>Hola ${user.nombres || user.usuario || "usuario"},</p>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <a href="${resetLink}" target="_blank">${resetLink}</a>
          <p> Este enlace expira en 15 minutos.</p>
        `,
      });

      console.log(" Correo enviado con éxito a:", user.email);
      return true;

    } catch (error) {
      console.error(" Error en forgotPassword:", error.message);
      throw error;
    }
  }

  static async resetPassword(token, newPassword) {
    try {
      // Verificamos el JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.updatePassword(decoded.userId, hashedPassword);

      console.log(" Contraseña actualizada para usuario:", decoded.userId);

      return true;
    } catch (error) {
      console.error(" Error en resetPassword:", error.message);
      throw new Error("Token inválido o expirado");
    }
  }
}

module.exports = AuthService;
