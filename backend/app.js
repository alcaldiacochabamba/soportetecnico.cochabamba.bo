// Carga las variables de entorno desde el archivo .env (si existe)
require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { sequelize } = require('./models'); // O el archivo donde configuras la conexión
const cors = require('cors');
const express = require('express');
const morgan = require("morgan"); // Middleware para registrar solicitudes HTTP
const router = require('./router/router'); // Importa el enrutador con las rutas de la API
const path = require("path");
const multer = require('multer');
const upload = multer();
const qs = require('qs'); // Para serializar los datos
// Crea una instancia de la aplicación Express
const app = express();
const request = require('request');
// Middleware
app.use(morgan("dev")); // Log de cada solicitud HTTP
app.use(express.json()); // Analizar el cuerpo de las solicitudes JSON
app.use(cors()); // Configuración CORS, puedes personalizarlo según los orígenes permitidos
app.use(express.urlencoded({ extended: true })); // Si necesitas leer datos del body en POST
app.use("/api/v1/uploads", express.static(path.join(__dirname, "uploads")));



// Obtén el puerto de la variable de entorno o usa 3001 por defecto
const port = process.env.APP_PORT || 3001;

// Ruta raíz para verificar que el servidor esté funcionando
app.get("/", (req, res) => {
    res.send("This is Express");
});

// Usa el enrutador para todas las rutas que comienzan con '/api/v1'
app.use("/api/v1", router);

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Solo para desarrollo
  }),
  headers: {
    'Host': 'soportetecnicoapidev.cochabamba.bo'
  }
});

app.get('/api/bienes', async (req, res) => {
    try {
      const codigo = req.query.codigo; // Obtener el código de los parámetros de la consulta
  console.log("Codigo",codigo);
      // Realizar la solicitud POST al servidor externo
    const response = await axiosInstance.post('https://appgamc.cochabamba.bo/transparencia/servicio/ws-consulta-bienes.php', {
        cod_bienes: codigo  // Enviar el código de bienes en el cuerpo de la solicitud
      });
      console.log("data",response);
      // Devolver la respuesta a tu frontend
      res.json(response.data);
    } catch (error) {
      console.error('Error al obtener los bienes:', error);
      res.status(500).json({ error: 'Error al consultar los bienes' });
    }
  });

  app.post('/api/proxy', async (req, res) => {
    try {
      const data = qs.stringify(req.body); // Convierte a x-www-form-urlencoded
  
      const response = await axiosInstance.post(
        'https://appgamc.cochabamba.bo/transparencia/servicio/ws-consulta-bienes.php',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
  
      res.send(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.post('/api/empleados', async (req, res) => {
    try {
      const data = qs.stringify(req.body); // Convierte a x-www-form-urlencoded
  
      const response = await axiosInstance.post(
        'https://appgamc.cochabamba.bo/transparencia/servicio/buscar-empleados.php',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
  
      res.send(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.post('/api/v1/proxy/buscar-empleados-ci', upload.none(), async (req, res) => {
    try {
        console.log('Datos recibidos en el backend:', req.body); // Debug
        
        if (!req.body.dato) {
            return res.status(400).json({
                status: false,
                data: "No ingresaste datos"
            });
        }

        const data = qs.stringify({
            dato: req.body.dato,
            tipo: 'D'
        });

        console.log('Datos a enviar a la API externa:', data); // Debug

        const response = await axiosInstance.post(
            'https://appgamc.cochabamba.bo/transparencia/servicio/busqueda_empleados.php',
            data,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('Respuesta de la API externa:', response.data); // Debug

        res.json(response.data);
    } catch (error) {
        console.error('Error en proxy buscar-empleados-ci:', error);
        res.status(500).json({ 
            error: 'Error al buscar empleados por CI',
            details: error.message 
        });
    }
  });
  

// Función para probar la conexión
async function testDatabaseConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida correctamente.');
        
        // Verificar si podemos hacer consultas
        const result = await sequelize.query('SELECT NOW()');
        console.log('⏰ Hora del servidor de base de datos:', result[0][0].now);
        
        // Verificar tablas existentes
        const tables = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📋 Tablas encontradas:', tables[0].map(t => t.table_name));
        
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        console.error('Detalles del error:', {
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT,
            database: process.env.DATABASE_NAME,
            user: process.env.DATABASE_USERNAME
        });
        return false;
    }
}

// Iniciar el servidor solo si la conexión es exitosa
async function startServer() {
    console.log('🚀 Iniciando servidor...');
    
    // Intentar conectar a la base de datos
    const isConnected = await testDatabaseConnection();
    
    if (!isConnected) {
        console.warn('⚠️ No se pudo establecer conexión con la base de datos. Continuando sin sincronización.');
    }

    // Iniciar el servidor
    app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 Servidor corriendo en el puerto ${port}`);
    });
}

// Iniciar el servidor
startServer().catch(error => {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
});

// Exporta la aplicación para que otros archivos puedan usarla
module.exports = app;

app.post('/api/v1/user/login', async (req, res) => {
  try {
    console.log('Datos de login recibidos:', req.body);
    
    const response = await axiosInstance.post(
      'https://soportetecnicoapidev.cochabamba.bo/api/v1/user/login', 
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'soportetecnicoapidev.cochabamba.bo'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error detallado de login:', {
      message: error.message,
      code: error.code,
      config: error.config,
      response: error.response ? error.response.data : 'No response'
    });
    
    res.status(500).json({ 
      error: 'Error en el inicio de sesión',
      details: error.message 
    });
  }
});

const dns = require('dns');
const os = require('os');

function performNetworkDiagnostics() {
    // Mostrar interfaces de red
    console.log('Interfaces de red:', os.networkInterfaces());

    // Resolver el hostname correctamente
    dns.lookup('soportetecnicoapidev.cochabamba.bo', (err, resolvedAddress, family) => {
        if (err) {
            console.error('Error de resolución DNS:', err);
            return;
        }
        console.log('Dirección IP resuelta:', resolvedAddress);
        console.log('Familia de direcciones:', family);

        // Resolución inversa solo si la resolución inicial fue exitosa
        dns.reverse(resolvedAddress, (reverseErr, hostnames) => {
            if (reverseErr) {
                console.error('Error de resolución inversa:', reverseErr);
                return;
            }
            console.log('Hostnames:', hostnames);
        });
    });
}

performNetworkDiagnostics();
