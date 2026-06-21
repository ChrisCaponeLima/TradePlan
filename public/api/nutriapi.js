import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            try {
                // Procura se o arquivo existe dentro do seu Storage
                const { blobs } = await list();
                const arquivoDieta = blobs.find(b => b.pathname === 'nutridieta.json');
                
                if (arquivoDieta) {
                    const dados = await fetch(arquivoDieta.url).then(r => r.json());
                    return res.status(200).json(dados);
                }
                
                // Se não achou o arquivo, entrega a estrutura zerada padrão
                return res.status(200).json({ segunda:[], terca:[], quarta:[], quinta:[], sexta:[], sabado:[], domingo:[] });
            } catch (err) {
                return res.status(200).json({ segunda:[], terca:[], quarta:[], quinta:[], sexta:[], sabado:[], domingo:[] });
            }
        }

        if (req.method === 'POST') {
            const novosDados = req.body;

            // Salva ou sobrescreve o arquivo usando o token injetado no sistema
            const respostaBlob = await put('nutridieta.json', JSON.stringify(novosDados), {
                access: 'public',
                addRandomSuffix: false
            });

            return res.status(200).json({ sucesso: true, url: respostaBlob.url });
        }
    } catch (erro) {
        return res.status(500).json({ error: "Erro na operação do Blob", detalhes: erro.message });
    }
}