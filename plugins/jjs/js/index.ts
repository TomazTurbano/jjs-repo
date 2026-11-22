import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { porExtenso, MAX, type Lang } from './numbers'

/**
 * /jjs inicio:0 fim:5 idioma:pt-br sufixo:" !" maiusculas:sim
 *
 * Não há API de slash commands no Revenge Next, então o plugin intercepta o
 * envio de mensagens (MessageActions.sendMessage): se o texto começa com "/jjs",
 * a mensagem NÃO é enviada e, no lugar, a contagem é enviada mensagem por mensagem.
 */

type SendMessage = (channelId: string, message: any, ...rest: any[]) => any

const MIN_INTERVALO = 1000 // ms (abaixo disso o Discord aplica rate limit)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const COM = 'áàâãäéèêëíìîïóòôõöúùûüç'
const SEM = 'aaaaaeeeeiiiiooooouuuuc'
const semAcento = (s: string) =>
    s.toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, c => SEM[COM.indexOf(c)])

function parseArgs(texto: string): Record<string, string> {
    const out: Record<string, string> = {}
    // chave:valor | chave:"valor com espaços"
    for (const m of texto.matchAll(/([A-Za-z\u00C0-\u00FF_]+):("([^"]*)"|\S+)/g)) {
        out[semAcento(m[1])] = m[3] ?? m[2]
    }
    return out
}

const sim = (v?: string) => ['sim', 's', 'true', '1', 'yes', 'y'].includes(semAcento(v ?? ''))

function normalizaIdioma(v?: string): Lang {
    const s = semAcento(v ?? 'pt-br')
    if (s.startsWith('en')) return 'en'
    if (s.startsWith('es')) return 'es'
    return 'pt-br'
}

export default plugin({
    start({ cleanup, logger }) {
        let rodando = false
        let cancelar = false
        cleanup(() => {
            cancelar = true
        })

        const aviso = (msg: string) => logger.log(`[jjs] ${msg}`)

        async function executar(canal: string, args: Record<string, string>, enviar: SendMessage, rest: any[]) {
            if (sim(args.parar) || 'parar' in args) {
                cancelar = true
                return
            }
            if (rodando) return aviso('já existe uma contagem em andamento (use /jjs parar:sim)')

            const inicio = Number.parseInt(args.inicio ?? '', 10)
            const fim = Number.parseInt(args.fim ?? '', 10)
            if (Number.isNaN(inicio) || Number.isNaN(fim)) return aviso('uso: /jjs inicio:0 fim:5 [idioma:pt-br] [sufixo:" !"] [maiusculas:sim]')
            if (Math.min(inicio, fim) < 0 || Math.max(inicio, fim) > MAX) return aviso(`use números entre 0 e ${MAX}`)

            const idioma = normalizaIdioma(args.idioma)
            const sufixo = args.sufixo ?? ''
            const caps = sim(args.maiusculas)
            const intervalo = Math.max(MIN_INTERVALO, Number.parseInt(args.intervalo ?? '', 10) || MIN_INTERVALO)
            const passo = inicio <= fim ? 1 : -1 // aceita contagem regressiva
            const total = Math.abs(fim - inicio) + 1

            rodando = true
            cancelar = false
            try {
                for (let i = 0, n = inicio; i < total && !cancelar; i++, n += passo) {
                    let texto = porExtenso(n, idioma)
                    if (caps) texto = texto.toLocaleUpperCase(idioma === 'pt-br' ? 'pt-BR' : idioma)

                    await enviar(
                        canal,
                        { content: texto + sufixo, tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
                        ...rest,
                    )
                    if (i < total - 1) await sleep(intervalo)
                }
            } catch (e) {
                logger.log(`[jjs] erro: ${String(e)}`)
            } finally {
                rodando = false
                cancelar = false
            }
        }

        cleanup(
            getModules(withProps<{ sendMessage: SendMessage }>('sendMessage', 'receiveMessage'), MessageActions => {
                cleanup(
                    instead(MessageActions, 'sendMessage', (args: any[], original: SendMessage) => {
                        const [canal, mensagem, ...rest] = args
                        const conteudo: unknown = mensagem?.content
                        if (typeof conteudo !== 'string' || !/^\/jjs(\s|$)/i.test(conteudo)) {
                            return original(canal, mensagem, ...rest)
                        }
                        // não envia o "/jjs ..."; roda a contagem em segundo plano
                        void executar(canal, parseArgs(conteudo), original, rest)
                        return Promise.resolve()
                    }),
                )
            }),
        )
    },
})
