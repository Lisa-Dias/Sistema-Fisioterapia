function asyncRoute(handler) {
    return function wrappedRoute(req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensagem: 'Já existe um registro com esses dados.' });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ mensagem: 'O paciente ou plano informado não existe.' });
    }

    if (error.status) {
        return res.status(error.status).json({ mensagem: error.message });
    }

    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ mensagem: 'Não foi possível concluir a operação.' });
}

module.exports = { asyncRoute, errorHandler };
