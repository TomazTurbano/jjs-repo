export type Lang = "pt-br" | "en" | "es";

// ---------- PT-BR ----------
const PU = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
const PD = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
const PC = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];

function pt999(n: number): string {
    if (n < 20) return PU[n];
    if (n < 100) return PD[Math.floor(n / 10)] + (n % 10 ? " e " + PU[n % 10] : "");
    if (n === 100) return "cem";
    const r = n % 100;
    return PC[Math.floor(n / 100)] + (r ? " e " + pt999(r) : "");
}

// ---------- EN ----------
const EU = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const ET = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function en999(n: number): string {
    if (n < 20) return EU[n];
    if (n < 100) return ET[Math.floor(n / 10)] + (n % 10 ? "-" + EU[n % 10] : "");
    return EU[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + en999(n % 100) : "");
}
// ---------- ES ----------
const SU = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis","veintisiete","veintiocho","veintinueve"];
const SD = ["","","","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
const SC = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];

function es999(n: number): string {
    if (n < 30) return SU[n];
    if (n < 100) return SD[Math.floor(n / 10)] + (n % 10 ? " y " + SU[n % 10] : "");
    if (n === 100) return "cien";
    return SC[Math.floor(n / 100)] + (n % 100 ? " " + es999(n % 100) : "");
}



// ---------- Escalas (até 999.999.999.999) ----------
function pt(n: number): string {
    if (n < 1000) return pt999(n);
    const [s, sing, plur] = n >= 1e9 ? [1e9, "bilhão", "bilhões"] : n >= 1e6 ? [1e6, "milhão", "milhões"] : [1e3, "mil", "mil"];
    const q = Math.floor(n / s), r = n % s;
    const head = s === 1e3 ? (q === 1 ? "mil" : pt999(q) + " mil") : pt(q) + " " + (q === 1 ? sing : plur);
    if (!r) return head;
    return head + (r < 100 || (r < 1000 && r % 100 === 0) ? " e " : " ") + pt(r);
}

function en(n: number): string {
    if (n < 1000) return en999(n);
    const [s, name] = n >= 1e9 ? [1e9, "billion"] : n >= 1e6 ? [1e6, "million"] : [1e3, "thousand"];
    const q = Math.floor(n / s), r = n % s;
    return en(q) + " " + name + (r ? " " + en(r) : "");
}

const apoc = (t: string) => t.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

function es(n: number): string {
    if (n < 1000) return es999(n);
    if (n >= 1e6) {
        const q = Math.floor(n / 1e6), r = n % 1e6;
        const head = q === 1 ? "un millón" : apoc(es(q)) + " millones";
        return head + (r ? " " + es(r) : "");
    }
    const q = Math.floor(n / 1e3), r = n % 1e3;
    const head = q === 1 ? "mil" : apoc(es999(q)) + " mil";
    return head + (r ? " " + es999(r) : "");
}

export const MAX = 999_999_999_999;

export function porExtenso(n: number, lang: Lang): string {
    if (!Number.isInteger(n) || n < 0 || n > MAX) throw new RangeError(`Número fora do intervalo 0–${MAX}`);
    return lang === "en" ? en(n) : lang === "es" ? es(n) : pt(n);
}