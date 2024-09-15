const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Configurações gerais
const CONFIG = {
    LOGIN_URL: 'https://admin.mercadao.pt/auth/shoppers/login',
    ORDERS_URL: 'https://admin.mercadao.pt/shoppers/orders/list',
    EMAIL: 'sofiapbarbosa@outlook.pt',
    PASSWORD: 'Sofia.1997',
    EMAIL_USER: 'gabrieloliveirasantos196@gmail.com',
    EMAIL_PASS: 'prrw jqpn qnlu yseh',
    NOTIFY_EMAIL: [
        'gabrieloliveirasantos196@gmail.com', 
        'sofiapbarbosa@outlook.pt'
    ], // Lista de emails para notificação
    PHONE_NUMBERS: [
        '+351912254309',
        
    ], // Lista de números de telefone para SMS
    TWILIO_ACCOUNT_SID: 'AC4374ecdbf58f4305e696857bf84269f2',
    TWILIO_AUTH_TOKEN: '2b0028d14e71b9d437bd155e93f39276',
    TWILIO_PHONE_NUMBER: '+14439607648',
    CHECK_INTERVAL: 10000 // Intervalo de verificação em milissegundos
};

// Função para enviar notificação por email
async function sendEmailNotification(message) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: CONFIG.EMAIL_USER,
            pass: CONFIG.EMAIL_PASS
        }
    });

    let mailOptions = {
        from: CONFIG.EMAIL_USER,
        to: CONFIG.NOTIFY_EMAIL,
        subject: 'Novo Pedido Recebido',
        text: message
    };
    // ddd 

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Erro ao enviar email:', error);
        }
        console.log('Email enviado: ' + info.response);
    });
}

// Função para enviar notificação por SMS
async function sendSmsNotification(message) {
    const client = twilio(CONFIG.TWILIO_ACCOUNT_SID, CONFIG.TWILIO_AUTH_TOKEN);

    for (let number of CONFIG.PHONE_NUMBERS) {
        client.messages
            .create({
                body: message,
                from: CONFIG.TWILIO_PHONE_NUMBER,
                to: number
            })
            .then(message => console.log(`SMS enviado para ${number}, SID: ${message.sid}`))
            .catch(error => console.error(`Erro ao enviar SMS para ${number}:`, error));
    }
}

// Função para verificar novos pedidos
async function checkOrders() {
    const browser = await puppeteer.launch({
        headless: true, // Certifique-se de que está rodando no modo headless
        executablePath: puppeteer.executablePath(), // Garante que usa o Chrome instalado
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Essas opções ajudam a rodar o Puppeteer no Render
    });
    


    const page = await browser.newPage();
    
    // Função para reiniciar a página caso ocorra algum problema
    async function restartPage() {
        try {
            console.log('Reiniciando a página...');
            await page.close();  // Fecha a página atual
            page = await browser.newPage();  // Abre uma nova página
            await page.goto(CONFIG.LOGIN_URL);
            await page.type('#email', CONFIG.EMAIL);
            await page.type('#password', CONFIG.PASSWORD);
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
            await page.goto(CONFIG.ORDERS_URL);
            console.log('Página reiniciada com sucesso.');
        } catch (error) {
            console.error('Erro ao reiniciar a página:', error);
        }
    }

    // Acessar a página de login
    await page.goto(CONFIG.LOGIN_URL);
    await page.type('#email', CONFIG.EMAIL);
    await page.type('#password', CONFIG.PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Acessar a página de pedidos
    await page.goto(CONFIG.ORDERS_URL);

    let lastTotal = "0 total"; // Valor inicial do total de pedidos

    const checkForOrderChanges = async () => {
        console.log(`Verificando a página para alterações em ${new Date().toLocaleString()}`);
        
        try {
            await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
            
            const totalText = await page.evaluate(() => {
                const element = document.querySelector('.page-count');
                return element ? element.innerText : null;
            });

            if (totalText) {
                console.log(`Texto encontrado: ${totalText}`);
                if (totalText !== lastTotal && totalText !== "0 total") {
                    lastTotal = totalText;
                    const message = `Novo pedido detectado! ${totalText}`;
                    console.log(message);
            
                    // Enviar notificações
                    await sendEmailNotification(message);
                    await sendSmsNotification(message);
                } else {
                    console.log('Nenhum pedido novo encontrado.');
                }
            } else {
                console.log('Elemento "total" não encontrado na página.');
            }
            
        } catch (error) {
            console.error('Erro ao verificar pedidos:', error);
            await restartPage();  // Reinicia a página em caso de erro
        }
    };

    // Verifica a cada intervalo definido
    setInterval(checkForOrderChanges, CONFIG.CHECK_INTERVAL);
}

// Função de teste para garantir que as notificações estão funcionando
async function testNotifications() {
    const testMessage = 'Teste de notificação: sistema funcionando corretamente.';
    await sendEmailNotification(testMessage);
    await sendSmsNotification(testMessage);
}

// Iniciar o monitoramento
(async () => {
    console.log('Iniciando monitoramento de pedidos...');
    await testNotifications();  // Enviar uma notificação de teste
    await checkOrders();  // Iniciar a verificação de pedidos
})();
