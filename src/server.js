const app = require('./app');
const database = require('./database');
const { port } = require('./config');

async function startServer() {
    try {
        const connection = await database.getConnection();
        connection.release();

        app.listen(port, () => {
            console.log(`Sistema da clínica disponível em http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Não foi possível conectar ao banco de dados fisio_db:', error);
        process.exitCode = 1;
    }
}

startServer();
