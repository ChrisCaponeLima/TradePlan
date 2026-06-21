import { put } from '@vercel/blob';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // A própria Vercel sabe onde salvar usando a variável oculta que ela criou para você!
    const token = process.env.BLOB_READ_WRITE_TOKEN; 

    try {
        if (req.method === 'GET') {
            try {
                // Ele busca direto pelo nome do arquivo associado ao seu token
                const dados = await fetch(`https://blob.vercel-storage.com/nutridieta.json`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(r => r.json());
                
                return res.status(200).json(dados);
            } catch {
                return res.status(200).json({ segunda:[], terca:[], quarta:[], quinta:[], sexta:[], sabado:[], domingo:[] });
            }
        }

        if (req.method === 'POST') {
            const novosDados = req.body;
            // Salva ou atualiza o arquivo usando o token automático
            await put('nutridieta.json', JSON.stringify(novosDados), {
                access: 'public',
                addRandomSuffix: false,
                token: token
            });
            return res.status(200).json({ sucesso: true });
        }
    } catch (erro) {
        return res.status(500).json({ error: erro.message });
    }
}