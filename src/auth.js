const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('./database');
const { jwtSecret } = require('./config');
const { asyncRoute } = require('./errors');

function normalizeBcryptHash(hash) {
    return hash.startsWith('$2y$') ? `$2b$${hash.slice(4)}` : hash;
}

const login = asyncRoute(async (req, res) => {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const senha = typeof body.senha === 'string' ? body.senha : '';

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    }

    const [rows] = await database.execute(
        'SELECT id_usuario, nome, email, senha, perfil FROM usuario WHERE email = ? LIMIT 1',
        [email]
    );
    const usuario = rows[0];
    const senhaCorreta = usuario && await bcrypt.compare(senha, normalizeBcryptHash(usuario.senha));

    if (!senhaCorreta) {
        return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
    }

    const usuarioPublico = {
        id: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
    };
    const token = jwt.sign(usuarioPublico, jwtSecret, {
        algorithm: 'HS256',
        expiresIn: '8h'
    });

    return res.json({ token, usuario: usuarioPublico });
});

function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const [scheme, token, extra] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token || extra) {
        return res.status(401).json({ mensagem: 'Autenticação necessária.' });
    }

    try {
        req.usuario = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return res.status(401).json({ mensagem: 'Sessão inválida ou expirada. Faça login novamente.' });
        }
        return next(error);
    }
}

module.exports = { login, authenticate };
