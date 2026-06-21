import { put, get } from '@vercel/blob';

export default async function handler(req, res) {
    // Habilita CORS para você testar de qualquer lugar se necessário
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Nome do arquivo que será salvo no Storage da Vercel
    const BLOB_URL = "https://suabucket.blob.vercel-storage.com/nutridieta.json"; 
    // Nota: O Vercel Blob gera uma URL própria única quando você cria o storage no painel da Vercel.

    try {
        if (req.method === 'GET') {
            // Busca o JSON atualizado no Storage
            try {
                const dados = await fetch(BLOB_URL).then(r => r.json());
                return res.status(200).json(dados);
            } catch {
                // Se o arquivo ainda não existir, entrega uma estrutura padrão vazia
                return res.status(200).json({ segunda:[], terca:[], quarta:[], quinta:[], sexta:[], sabado:[], domingo:[] });
            }
        }

        if (req.method === 'POST') {
            const novosDados = req.body;
            // Salva o JSON diretamente no Vercel Blob (sobrescrevendo o antigo)
            const { url } = await put('nutridieta.json', JSON.stringify(novosDados), {
                access: 'public',
                addRandomSuffix: false // Mantém o nome limpo fixo
            });
            return res.status(200).json({ sucesso: true, url });
        }
    } catch (erro) {
        return res.status(500).json({ error: erro.message });
    }
}