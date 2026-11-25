const express = require('express');
const database = require('./database');
const { encryptCpf } = require('./crypto');
const { asyncRoute } = require('./errors');

const router = express.Router();
const patientColumns = `
    id_paciente AS id, nome, data_nascimento AS dataNascimento,
    telefone, email, endereco
`;

function badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validCpf(value) {
    const cpf = value.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const calculateDigit = (length) => {
        const sum = cpf.slice(0, length).split('')
            .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function patientInput(body, { cpfOptional = false } = {}) {
    body = body || {};
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const cpf = typeof body.cpf === 'string' ? body.cpf.replace(/\D/g, '') : '';
    const dataNascimento = typeof body.dataNascimento === 'string' ? body.dataNascimento : '';
    const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const endereco = typeof body.endereco === 'string' ? body.endereco.trim() : '';

    if (!nome || nome.length > 100 || !dataNascimento || !telefone || telefone.length > 20) {
        throw badRequest('Nome, data de nascimento e telefone válidos são obrigatórios.');
    }
    if (email.length > 100 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw badRequest('Informe um e-mail válido com até 100 caracteres.');
    }
    if (endereco.length > 255) {
        throw badRequest('O endereço deve ter no máximo 255 caracteres.');
    }
    if (!cpfOptional || cpf) {
        if (!validCpf(cpf)) {
            throw badRequest('Informe um CPF válido.');
        }
    }
    if (!validDate(dataNascimento)) {
        throw badRequest('Informe uma data de nascimento válida.');
    }

    return { nome, cpf, dataNascimento, telefone, email, endereco };
}

router.get('/', asyncRoute(async (req, res) => {
    const termo = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';
    let rows;

    if (termo) {
        const pattern = `%${termo}%`;
        [rows] = await database.execute(
            `SELECT ${patientColumns}
             FROM paciente
             WHERE nome LIKE ? OR email LIKE ? OR telefone LIKE ?
             ORDER BY nome`,
            [pattern, pattern, pattern]
        );
    } else {
        [rows] = await database.execute(
            `SELECT ${patientColumns} FROM paciente ORDER BY nome`
        );
    }

    return res.json(rows);
}));

router.post('/', asyncRoute(async (req, res) => {
    const patient = patientInput(req.body);
    const [result] = await database.execute(
        `INSERT INTO paciente (nome, cpf, data_nascimento, telefone, email, endereco)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            patient.nome,
            encryptCpf(patient.cpf),
            patient.dataNascimento,
            patient.telefone,
            patient.email || null,
            patient.endereco || null
        ]
    );

    return res.status(201).json({ id: result.insertId, mensagem: 'Paciente cadastrado.' });
}));

router.put('/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        throw badRequest('Identificador de paciente inválido.');
    }

    const patient = patientInput(req.body, { cpfOptional: true });
    const values = [
        patient.nome,
        patient.dataNascimento,
        patient.telefone,
        patient.email || null,
        patient.endereco || null
    ];
    let cpfClause = '';

    if (patient.cpf) {
        cpfClause = ', cpf = ?';
        values.push(encryptCpf(patient.cpf));
    }
    values.push(id);

    const [result] = await database.execute(
        `UPDATE paciente
         SET nome = ?, data_nascimento = ?, telefone = ?, email = ?, endereco = ?${cpfClause}
         WHERE id_paciente = ?`,
        values
    );
    if (!result.affectedRows) {
        return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
    }

    return res.json({ mensagem: 'Paciente atualizado.' });
}));

module.exports = router;
