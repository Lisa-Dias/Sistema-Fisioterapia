const express = require('express');
const database = require('./database');
const { asyncRoute } = require('./errors');

const router = express.Router();

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function isoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

router.get('/', asyncRoute(async (req, res) => {
    const [rows] = await database.execute(
        `SELECT pt.id_plano AS id, pt.id_paciente AS idPaciente, pt.descricao,
                pt.objetivo, pt.qtd_sessoes AS quantidadeSessoes,
                pt.data_inicio AS dataInicio, pt.status, p.nome AS nomePaciente
         FROM plano_tratamento pt
         INNER JOIN paciente p ON p.id_paciente = pt.id_paciente
         ORDER BY pt.data_inicio DESC, pt.id_plano DESC`
    );
    return res.json(rows);
}));

router.post('/', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const pacienteId = Number(body.idPaciente);
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
    const objetivo = typeof body.objetivo === 'string' ? body.objetivo.trim() : '';
    const quantidadeSessoes = Number(body.quantidadeSessoes);
    const dataInicio = body.dataInicio;
    const status = typeof body.status === 'string' ? body.status.trim() : '';

    if (!Number.isSafeInteger(pacienteId) || pacienteId < 1) {
        throw invalid('Selecione um paciente para o plano.');
    }
    if (!descricao || descricao.length > 255 || objetivo.length > 255) {
        throw invalid('Descrição obrigatória; descrição e objetivo devem ter até 255 caracteres.');
    }
    if (!Number.isSafeInteger(quantidadeSessoes) || quantidadeSessoes < 1) {
        throw invalid('A quantidade de sessões deve ser um número positivo.');
    }
    if (!isoDate(dataInicio)) {
        throw invalid('Informe uma data de início válida.');
    }
    if (!status || status.length > 30) {
        throw invalid('Informe um status com até 30 caracteres.');
    }

    const [result] = await database.execute(
        `INSERT INTO plano_tratamento
            (id_paciente, descricao, objetivo, qtd_sessoes, data_inicio, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pacienteId, descricao, objetivo || null, quantidadeSessoes, dataInicio, status]
    );
    return res.status(201).json({ id: result.insertId, mensagem: 'Plano cadastrado.' });
}));

module.exports = router;
