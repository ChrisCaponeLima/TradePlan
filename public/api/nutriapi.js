import { put } from '@vercel/blob';

export default async function handler(req, res) {
    // Configuração de CORS para evitar bloqueios de segurança do navegador
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            try {
                // Tenta buscar o arquivo direto no Storage público da Vercel
                // (Substitua abaixo pelo nome correto do seu arquivo se souber, ou deixe assim para a busca padrão)
                const dados = await fetch(`https://blob.vercel-storage.com/nutridieta.json`, {
                    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
                }).then(r => r.json());
                
                return res.status(200).json(dados);
            } catch {
                // Se o arquivo não existir ainda, entrega a estrutura limpa
                return res.status(200).json({ segunda:[], terca:[], quarta:[], quinta:[], sexta:[], sabado:[], domingo:[] });
            }
        }

        if (req.method === 'POST') {
            const novosDados = req.body;

            // Salva o JSON no Vercel Blob usando as variáveis automáticas do sistema
            const respostaBlob = await put('nutridieta.json', JSON.stringify(novosDados), {
                access: 'public',
                addRandomSuffix: false
            });

            return res.status(200).json({ sucesso: true, url: respostaBlob.url });
        }
    } catch (erro) {
        // Se der erro, ele vai devolver o motivo real em vez de apenas travar
        return res.status(500).json({ error: "Erro interno no Blob", detalhes: erro.message });
    }
}