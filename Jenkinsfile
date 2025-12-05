pipeline {
    agent { label 'server_104.68' }

    environment {
        // Definir variables de entorno para evitar la repetición de valores
        DOCKER_COMPOSE_FILE = 'docker-compose-dev.yml'
        GIT_URL = 'https://gitlab.cochabamba.bo/ddsi/notificaciones.cochabamba.bo.git'
        GIT_BRANCH = 'dev'
        GIT_TOKEN = 'temporal.1'
    }

    stages {
        stage('Cloning') {
            steps {
                // Configurar Git para ignorar verificación SSL
                sh 'git config --global http.sslVerify false'
                
                sh '''
                    # Limpiar el directorio de trabajo
                    rm -rf * .[!.]* || true
                    
                    # Clonar el repositorio con token
                    git clone https://oauth2:''' + env.GIT_TOKEN + '''@gitlab.cochabamba.bo/ddsi/notificaciones.cochabamba.bo.git .
                    
                    # Cambiar al branch correcto
                    git checkout ${GIT_BRANCH}
                '''
            }
        }

        // Resto del pipeline igual...
    }
}