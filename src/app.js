const express = require('express');
const path = require('path');
const { login, authenticate } = require('./auth');
const pacientes = require('./pacientes');
const planos = require('./planos');
const sessoes = require('./sessoes');
const { errorHandler } = require('./errors');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticate, (req, res) => {
    const { id, nome, email, perfil } = req.usuario;
    return res.json({ id, nome, email, perfil });
});
app.use('/api/pacientes', authenticate, pacientes);
app.use('/api/planos', authenticate, planos);
app.use('/api/sessoes', authenticate, sessoes);

app.use('/api', (req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
app.use(errorHandler);

module.exports = app;
