const express = require('express');
const database = require('./database');
const { asyncRoute } = require('./errors');

const router = express.Router();

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

router.get('/', asyncRoute(async (req, res) => {
    const [rows] = await database.execute(
        `SELECT s.id_sessao AS id, s.data_sessao AS dataSessao,
                s.hora_sessao AS horaSessao, s.observacoes, s.status AS statusSessao,
                p.id_paciente AS idPaciente, p.nome AS nomePaciente,
                p.cpf AS cpfCriptografado,
                p.data_nascimento AS dataNascimento, p.telefone AS telefonePaciente,
                p.email AS emailPaciente, p.endereco AS enderecoPaciente,
                pt.id_plano AS idPlano, pt.descricao AS descricaoPlano,
                pt.objetivo AS objetivoPlano, pt.qtd_sessoes AS quantidadeSessoes,
                pt.data_inicio AS dataInicioPlano, pt.status AS statusPlano,
                u.nome AS nomeFisioterapeuta
         FROM sessao s
         INNER JOIN plano_tratamento pt ON pt.id_plano = s.id_plano
         INNER JOIN paciente p ON p.id_paciente = pt.id_paciente
         INNER JOIN usuario u ON u.id_usuario = s.id_usuario
         ORDER BY s.data_sessao ASC, s.hora_sessao ASC, s.id_sessao ASC`
    );
    return res.json(rows);
}));

router.post('/', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const idPlano = Number(body.idPlano);
    const dataSessao = body.dataSessao;
    const horaSessao = body.horaSessao;
    const observacoes = typeof body.observacoes === 'string' ? body.observacoes.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim() : '';

    if (!Number.isSafeInteger(idPlano) || idPlano < 1) {
        throw invalid('Selecione um plano de tratamento.');
    }
    if (!isIsoDate(dataSessao) || !isTime(horaSessao)) {
        throw invalid('Informe uma data e um horário válidos para a sessão.');
    }
    if (observacoes.length > 65535 || !status || status.length > 30) {
        throw invalid('Informe um status válido e observações com até 65.535 caracteres.');
    }

    const [result] = await database.execute(
        `INSERT INTO sessao (id_plano, id_usuario, data_sessao, hora_sessao, observacoes, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idPlano, req.usuario.id, dataSessao, horaSessao, observacoes || null, status]
    );
    return res.status(201).json({ id: result.insertId, mensagem: 'Sessão agendada.' });
}));

router.put('/:id/data', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1 || !isIsoDate(body.dataSessao)) {
        throw invalid('Informe uma sessão e uma data válidas.');
    }

    const [result] = await database.execute(
        'UPDATE sessao SET data_sessao = ? WHERE id_sessao = ?',
        [body.dataSessao, id]
    );
    if (!result.affectedRows) {
        return res.status(404).json({ mensagem: 'Sessão não encontrada.' });
    }
    return res.json({ mensagem: 'Data da sessão atualizada.' });
}));

module.exports = router;
